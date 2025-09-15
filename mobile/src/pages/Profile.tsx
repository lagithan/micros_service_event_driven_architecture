import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, Mail, Phone, Car, LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthService, TokenManager, DeliveryService, Driver } from "@/lib/api";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const driver = TokenManager.getDriver();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phoneNo: "",
    city: "",
    address: "",
    vehicleNumber: "",
  });
  const [statistics, setStatistics] = useState({
    deliveriesToday: 0,
    successRate: 0,
    totalDeliveries: 0,
  });

  useEffect(() => {
    if (!TokenManager.isAuthenticated()) {
      navigate('/signin');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    fetchProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfileData = async () => {
    try {
      // Load driver profile from stored data first
      if (driver) {
        setProfile({
          fullName: driver.fullName,
          email: driver.email,
          phoneNo: driver.phoneNo || "",
          city: driver.city || "",
          address: driver.address || "",
          vehicleNumber: driver.vehicleNumber || "",
        });
      }

      // Try to fetch fresh profile data from API
      const profileResponse = await AuthService.getProfile();
      if (profileResponse.success && profileResponse.data?.user) {
        const userData = profileResponse.data.user;
        setProfile({
          fullName: userData.fullName,
          email: userData.email,
          phoneNo: userData.phoneNo || "",
          city: userData.city || "",
          address: userData.address || "",
          vehicleNumber: userData.vehicleNumber || "",
        });
        TokenManager.setDriver(userData);
      }

      // Try to fetch delivery statistics
      try {
        const statsResponse = await DeliveryService.getStatistics();
        if (statsResponse.success) {
          setStatistics({
            deliveriesToday: statsResponse.data?.deliveriesToday || 0,
            successRate: statsResponse.data?.successRate || 0,
            totalDeliveries: statsResponse.data?.totalDeliveries || 0,
          });
        }
      } catch (error) {
        console.log('Statistics not available:', error);
        // Keep default statistics if API fails
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Unable to load profile data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    TokenManager.removeToken();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/signin");
  };

  const handleEdit = () => setEditMode(true);

  const handleCancel = () => {
    // Reset to original data
    if (driver) {
      setProfile({
        fullName: driver.fullName,
        email: driver.email,
        phoneNo: driver.phoneNo || "",
        city: driver.city || "",
        address: driver.address || "",
        vehicleNumber: driver.vehicleNumber || "",
      });
    }
    setEditMode(false);
  };

  const handleSave = async () => {
    // Validation
    if (!profile.fullName || !profile.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive"
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // Note: The current backend doesn't have an update profile endpoint
      // For now, we'll update the local storage and show a success message
      // In a real implementation, you would call an API endpoint to update the profile
      
      const updatedDriver = {
        ...driver,
        fullName: profile.fullName,
        email: profile.email,
        phoneNo: profile.phoneNo,
        city: profile.city,
        address: profile.address,
        vehicleNumber: profile.vehicleNumber,
      };

      TokenManager.setDriver(updatedDriver as Driver);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });
      
      setEditMode(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof profile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-bold">Profile</h1>
            <Button
              variant={editMode ? "default" : "outline"}
              className={editMode ? "bg-primary text-primary-foreground" : ""}
              onClick={handleEdit}
              disabled={editMode}
            >
              Edit
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {profile.fullName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{profile.fullName}</h2>
                <p className="text-muted-foreground">Delivery Driver</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={profile.fullName}
                  readOnly={!editMode}
                  onChange={e => handleInputChange('fullName', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={profile.email}
                  readOnly={!editMode}
                  onChange={e => handleInputChange('email', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={profile.phoneNo}
                  readOnly={!editMode}
                  onChange={e => handleInputChange('phoneNo', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="city"
                  value={profile.city}
                  readOnly={!editMode}
                  onChange={e => handleInputChange('city', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={profile.address}
                  readOnly={!editMode}
                  onChange={e => handleInputChange('address', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle Number</Label>
              <div className="relative">
                <Car className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="vehicle"
                  value={profile.vehicleNumber}
                  readOnly={!editMode}
                  onChange={e => handleInputChange('vehicleNumber', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Statistics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Driver Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-success mb-2">
                  {statistics.deliveriesToday}
                </div>
                <p className="text-sm text-muted-foreground">Deliveries Today</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {statistics.successRate}%
                </div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit/Save/Cancel Buttons */}
        {editMode ? (
          <div className="flex gap-4">
            <Button 
              onClick={handleSave} 
              className="flex-1" 
              size="lg"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button variant="outline" onClick={handleCancel} className="flex-1" size="lg">
              Cancel
            </Button>
          </div>
        ) : (
          <Button 
            variant="destructive" 
            onClick={handleLogout}
            className="w-full"
            size="lg"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        )}
      </main>
    </div>
  );
};

export default Profile;