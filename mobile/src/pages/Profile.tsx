import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, Mail, Phone, Car, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const driverName = localStorage.getItem("driverName") || "John Driver";

  // Editable state
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    fullName: driverName,
    email: localStorage.getItem("driverEmail") || "nivethantsothi19@gmail.com",
    phone: localStorage.getItem("driverPhone") || "+1234567890",
    vehicleNumber: localStorage.getItem("driverVehicle") || "ABC123",
    deliveriesToday: 12,
    successRate: 98,
  });

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("driverName");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/signin");
  };

  const handleEdit = () => setEditMode(true);

  const handleCancel = () => {
    setProfile({
      fullName: localStorage.getItem("driverName") || "John Driver",
      email: localStorage.getItem("driverEmail") || "nivethantsothi19@gmail.com",
      phone: localStorage.getItem("driverPhone") || "+1234567890",
      vehicleNumber: localStorage.getItem("driverVehicle") || "ABC123",
      deliveriesToday: 12,
      successRate: 98,
    });
    setEditMode(false);
  };

  const handleSave = () => {
    localStorage.setItem("driverName", profile.fullName);
    localStorage.setItem("driverEmail", profile.email);
    localStorage.setItem("driverPhone", profile.phone);
    localStorage.setItem("driverVehicle", profile.vehicleNumber);
    toast({ title: "Profile updated", description: "Your changes have been saved." });
    setEditMode(false);
  };

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
                  onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
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
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
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
                  value={profile.phone}
                  readOnly={!editMode}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
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
                  onChange={e => setProfile(p => ({ ...p, vehicleNumber: e.target.value }))}
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
                  {profile.deliveriesToday}
                </div>
                <p className="text-sm text-muted-foreground">Deliveries Today</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {profile.successRate}%
                </div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit/Save/Cancel Buttons */}
        {editMode ? (
          <div className="flex gap-4">
            <Button variant="success" onClick={handleSave} className="flex-1" size="lg">Save</Button>
            <Button variant="outline" onClick={handleCancel} className="flex-1" size="lg">Cancel</Button>
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