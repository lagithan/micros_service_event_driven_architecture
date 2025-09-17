import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  Mail, 
  Phone, 
  Building, 
  ArrowLeft,
  Edit,
  Save,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { AuthService, TokenManager } from '@/lib/api'

interface ProfileData {
  businessName: string;
  businessEmail: string;
  businessType: string;
  phoneNumber: string;
  city?: string;
  address?: string;
}

export default function Profile() {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [profileData, setProfileData] = useState<ProfileData>({
    businessName: '',
    businessEmail: '',
    businessType: '',
    phoneNumber: '',
    city: '',
    address: ''
  })

  const [originalData, setOriginalData] = useState<ProfileData>({
    businessName: '',
    businessEmail: '',
    businessType: '',
    phoneNumber: '',
    city: '',
    address: ''
  })

  // Load profile data on component mount
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const client = TokenManager.getClient()
      if (!client?.id) {
        setError('No client session found. Please log in again.')
        setIsLoading(false)
        return
      }

      console.log('Loading profile for client:', client.id)
      const response = await AuthService.getProfile()
      
      if (response.success && response.data?.profile) {
        const profile = response.data.profile
        const profileData = {
          businessName: profile.businessName || profile.name || '',
          businessEmail: profile.email || '',
          businessType: profile.businessType || 'Other',
          phoneNumber: profile.phoneNo || '',
          city: profile.city || '',
          address: profile.address || ''
        }
        
        setProfileData(profileData)
        setOriginalData(profileData)
        console.log('Profile loaded successfully:', profileData)
      } else {
        console.warn('Failed to load profile:', response)
        setError(response.message || 'Failed to load profile data')
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setError(null)
    
    try {
      // TODO: Implement actual profile update API call
      console.log('Saving profile:', profileData)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For now, just update local storage with the new data
      const client = TokenManager.getClient()
      if (client) {
        const updatedClient = {
          ...client,
          businessName: profileData.businessName,
          email: profileData.businessEmail,
          businessType: profileData.businessType,
          phoneNo: profileData.phoneNumber,
          city: profileData.city,
          address: profileData.address
        }
        TokenManager.setClient(updatedClient)
      }
      
      setOriginalData(profileData)
      setIsEditing(false)
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Failed to save profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCancelEdit = () => {
    setProfileData(originalData)
    setIsEditing(false)
    setError(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Loading profile...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-4 text-destructive" />
                  <p className="text-destructive mb-4">{error}</p>
                  <Button onClick={loadProfile} variant="outline">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Business Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Business Information
              </CardTitle>
              <Button
                variant={isEditing ? "outline" : "secondary"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isSaving}
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="businessName"
                    value={profileData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="businessEmail">Business Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="businessEmail"
                    type="email"
                    value={profileData.businessEmail}
                    onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="businessType">Business Type</Label>
                <Select 
                  value={profileData.businessType} 
                  onValueChange={(value) => handleInputChange('businessType', value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E-commerce Retailer">E-commerce Retailer</SelectItem>
                    <SelectItem value="Online Marketplace">Online Marketplace</SelectItem>
                    <SelectItem value="Manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="Distributor">Distributor</SelectItem>
                    <SelectItem value="Logistics Provider">Logistics Provider</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phoneNumber"
                    value={profileData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profileData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter your city"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter your business address"
                />
              </div>

              {error && (
                <div className="p-3 border border-destructive/50 bg-destructive/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">{error}</span>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    onClick={handleSaveProfile} 
                    className="gradient-primary"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}