import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import LogisticsScene from '@/components/3d/LogisticsScene'
import { Truck, Mail, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react'

export default function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email.trim()) {
      setError('Please enter your email address')
      return
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setError('')
    
    try {
      // Simulate checking if email exists
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // TODO: Add actual email verification logic here
      console.log('Email verified:', formData.email)
      
      // Move to password reset step
      setStep('reset')
    } catch (err) {
      setError('Email not found. Please check your email address.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.newPassword.trim()) {
      setError('Please enter a new password')
      return
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    setError('')
    
    try {
      // Simulate password reset
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // TODO: Implement actual password reset logic
      console.log('Password reset for:', formData.email)
      
      alert('Password reset successful! You can now login with your new password.')
      navigate('/login')
    } catch (err) {
      setError('Failed to reset password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('') // Clear error when user types
  }

  const handleBackToEmail = () => {
    setStep('email')
    setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }))
    setError('')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - 3D Scene */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary to-primary-dark">
        <div className="absolute inset-0">
          <LogisticsScene />
        </div>
        <div className="absolute inset-0 bg-black/20" />
        
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="w-16 h-16 gradient-secondary rounded-2xl flex items-center justify-center mb-6">
            {step === 'email' ? <Mail className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">
            {step === 'email' ? 'Reset Your Password' : 'Set New Password'}
          </h1>
          <p className="text-xl text-center text-gray-200 max-w-md">
            {step === 'email' 
              ? 'Enter your email address to verify your account and reset your password.'
              : 'Create a new secure password for your SwiftTrack account.'
            }
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
            
            <div className="flex justify-center mb-6 lg:hidden">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground">
              {step === 'email' ? 'Forgot Password?' : 'Create New Password'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {step === 'email' 
                ? 'No worries, we\'ll help you reset it' 
                : 'Enter your new password below'
              }
            </p>
          </div>

          {/* Form Card */}
          <Card className="shadow-xl border-0 bg-card">
            <CardHeader className="space-y-1">
              <CardTitle className="text-center">
                {step === 'email' ? 'Verify Your Email' : 'Reset Password'}
              </CardTitle>
              <CardDescription className="text-center">
                {step === 'email' 
                  ? 'Enter your registered email address'
                  : 'Your new password must be secure'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'email' ? (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your registered email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    variant="gradient" 
                    size="lg" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Verifying Email...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify Email
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="pl-10 pr-10"
                        required
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your new password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="pl-10 pr-10"
                        required
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <Button 
                      type="submit" 
                      variant="gradient" 
                      size="lg" 
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Resetting Password...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Reset Password
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="outline" 
                      size="lg" 
                      className="w-full"
                      onClick={handleBackToEmail}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Email Verification
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}