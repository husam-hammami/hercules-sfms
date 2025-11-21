import React, { useState, useRef } from 'react'
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Upload, 
  Settings, 
  Mail, 
  Clock, 
  Shield, 
  Plus,
  Send,
  Calendar,
  Database,
  BarChart3,
  FileText,
  Trash2,
  Edit,
  Save,
  PieChart,
  TrendingUp,
  Package,
  ListChecks,
  Download
} from 'lucide-react'

interface SMTPProfile {
  id: string
  name: string
  host: string
  port: string
  username: string
  password: string
  sender: string
}

interface EmailSchedule {
  enabled: boolean
  senderEmail: string
  recipientEmail: string
  sendTime: string
  includeDailyReport: boolean
  includeWeeklyReport: boolean
  includeMonthlyReport: boolean
  includeMaterialConsumptionReport: boolean
  includeDetailedReport: boolean
}

// Mock data for demonstration
const mockSMTPProfiles: SMTPProfile[] = []

const mockEmailSchedule: EmailSchedule = {
  enabled: false,
  senderEmail: 'sender@example.com',
  recipientEmail: 'recipient@example.com',
  sendTime: '09:00',
  includeDailyReport: true,
  includeWeeklyReport: false,
  includeMonthlyReport: false,
  includeMaterialConsumptionReport: true,
  includeDetailedReport: false
}

export function Admin() {
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const [smtpProfiles, setSMTPProfiles] = useState<SMTPProfile[]>(mockSMTPProfiles)
  const [emailSchedule, setEmailSchedule] = useState<EmailSchedule>(mockEmailSchedule)
  const [newProfile, setNewProfile] = useState<Omit<SMTPProfile, 'id'>>({
    name: '',
    host: '',
    port: '',
    username: '',
    password: '',
    sender: ''
  })
  const [testEmail, setTestEmail] = useState('')
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setCurrentLogo(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddProfile = () => {
    if (newProfile.name && newProfile.host && newProfile.port) {
      const profile: SMTPProfile = {
        ...newProfile,
        id: Date.now().toString()
      }
      setSMTPProfiles([...smtpProfiles, profile])
      setNewProfile({
        name: '',
        host: '',
        port: '',
        username: '',
        password: '',
        sender: ''
      })
    }
  }

  const handleDeleteProfile = (id: string) => {
    setSMTPProfiles(smtpProfiles.filter(profile => profile.id !== id))
  }

  const handleSendTestEmail = () => {
    if (testEmail) {
      // Simulate sending test email
      alert(`Test email would be sent to: ${testEmail}`)
    }
  }

  const handleSaveSchedule = () => {
    // Simulate saving email schedule
    alert('Email schedule saved successfully!')
  }

  return (
    <WaterSystemLayout 
      title="Admin Panel" 
      subtitle="System administration and configuration"
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Logo Upload Section */}
        <Card className="bg-slate-800/30 light:bg-white border-slate-700 light:border-gray-200 light:shadow-md">
          <CardHeader>
            <CardTitle className="text-white light:text-gray-900 flex items-center gap-3">
              <Upload className="h-6 w-6 text-cyan-400 light:text-blue-600" />
              Admin Panel - Upload Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white light:bg-blue-600 light:hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  CHOOSE FILE
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="text-slate-400 light:text-gray-600 text-sm mt-2">
                  No file chosen
                </p>
              </div>
              
              <Button
                variant="outline"
                disabled={!currentLogo}
                className="w-fit border-slate-600 light:border-gray-400 text-slate-300 light:text-gray-600 hover:bg-slate-700 light:hover:bg-gray-100"
              >
                UPLOAD LOGO
              </Button>
              
              <div>
                <h3 className="text-white light:text-gray-900 font-medium mb-2">Current Logo:</h3>
                {currentLogo ? (
                  <img 
                    src={currentLogo} 
                    alt="Current Logo" 
                    className="max-w-xs max-h-32 object-contain border border-slate-600 light:border-gray-300 rounded"
                  />
                ) : (
                  <div className="w-64 h-16 bg-slate-700/50 light:bg-gray-100 rounded border border-slate-600 light:border-gray-300 flex items-center justify-center">
                    <span className="text-slate-400 light:text-gray-500 text-sm">No logo uploaded</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* SMTP Profiles Section */}
          <Card className="bg-slate-800/30 light:bg-white border-slate-700 light:border-gray-200 light:shadow-md">
            <CardHeader>
              <CardTitle className="text-white light:text-gray-900 flex items-center gap-3">
                <Mail className="h-6 w-6 text-cyan-400 light:text-blue-600" />
                SMTP Profiles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Available Profiles */}
              <div>
                <h3 className="text-white light:text-gray-900 font-medium mb-3">Available Profiles</h3>
                <div className="bg-slate-700/30 light:bg-gray-50 rounded-lg p-4 min-h-[100px]">
                  {smtpProfiles.length === 0 ? (
                    <p className="text-slate-400 light:text-gray-600 text-sm">No profiles added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {smtpProfiles.map((profile) => (
                        <div key={profile.id} className="flex items-center justify-between bg-slate-600/30 light:bg-white rounded p-3 border border-slate-600 light:border-gray-200">
                          <div>
                            <p className="text-white light:text-gray-900 font-medium">{profile.name}</p>
                            <p className="text-slate-400 light:text-gray-600 text-sm">{profile.host}:{profile.port}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingProfile(profile.id)}
                              className="border-slate-600 light:border-gray-400 text-slate-300 light:text-gray-600"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteProfile(profile.id)}
                              className="border-red-600 light:border-red-500 text-red-400 light:text-red-600 hover:bg-red-900/30 light:hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Profile */}
              <div>
                <h3 className="text-white light:text-gray-900 font-medium mb-3">Add New Profile</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 light:text-gray-700 text-sm">Name</Label>
                    <Input
                      value={newProfile.name}
                      onChange={(e) => setNewProfile({...newProfile, name: e.target.value})}
                      className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-900 mt-1"
                      placeholder="Profile name"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 light:text-gray-700 text-sm">Host</Label>
                    <Input
                      value={newProfile.host}
                      onChange={(e) => setNewProfile({...newProfile, host: e.target.value})}
                      className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-900 mt-1"
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 light:text-gray-700 text-sm">Port</Label>
                    <Input
                      value={newProfile.port}
                      onChange={(e) => setNewProfile({...newProfile, port: e.target.value})}
                      className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-900 mt-1"
                      placeholder="587"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 light:text-gray-700 text-sm">Username</Label>
                    <Input
                      value={newProfile.username}
                      onChange={(e) => setNewProfile({...newProfile, username: e.target.value})}
                      className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-900 mt-1"
                      placeholder="username@example.com"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 light:text-gray-700 text-sm">Password</Label>
                    <Input
                      type="password"
                      value={newProfile.password}
                      onChange={(e) => setNewProfile({...newProfile, password: e.target.value})}
                      className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-900 mt-1"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 light:text-gray-700 text-sm">Sender</Label>
                    <Input
                      value={newProfile.sender}
                      onChange={(e) => setNewProfile({...newProfile, sender: e.target.value})}
                      className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-900 mt-1"
                      placeholder="sender@example.com"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddProfile}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white light:bg-blue-600 light:hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  ADD PROFILE
                </Button>
              </div>

              {/* Test Email */}
              <div>
                <h3 className="text-white light:text-gray-900 font-medium mb-3">Send Test Email from Active Profile</h3>
                <p className="text-slate-400 light:text-gray-600 text-sm mb-2">Recipient Email</p>
                <div className="flex gap-2">
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-900"
                    placeholder="test@example.com"
                  />
                  <Button
                    onClick={handleSendTestEmail}
                    disabled={!testEmail || smtpProfiles.length === 0}
                    className="bg-orange-600 hover:bg-orange-700 text-white light:bg-orange-600 light:hover:bg-orange-700 whitespace-nowrap"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    SEND TEST EMAIL
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Report Scheduler */}
          <Card className="bg-slate-800/30 light:bg-white border-slate-700 light:border-gray-200 light:shadow-md">
            <CardHeader>
              <CardTitle className="text-white light:text-gray-900 flex items-center gap-3">
                <Settings className="h-6 w-6 text-cyan-400 light:text-blue-600" />
                Email Report Scheduler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Enable Reports */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-reports"
                  checked={emailSchedule.enabled}
                  onCheckedChange={(checked) => 
                    setEmailSchedule({...emailSchedule, enabled: !!checked})
                  }
                  className="border-slate-600 light:border-gray-400"
                />
                <Label htmlFor="enable-reports" className="text-white light:text-gray-900 font-medium">
                  Enable Daily Email Reports
                </Label>
              </div>

              {/* Email Configuration */}
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-300 light:text-gray-700 text-sm">Sender Email</Label>
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 text-slate-400 light:text-gray-500 mr-2" />
                    <Input
                      value={emailSchedule.senderEmail}
                      onChange={(e) => setEmailSchedule({...emailSchedule, senderEmail: e.target.value})}
                      className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-900"
                      placeholder="sender@example.com"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 light:text-gray-700 text-sm">Recipient Email</Label>
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 text-slate-400 light:text-gray-500 mr-2" />
                    <Input
                      value={emailSchedule.recipientEmail}
                      onChange={(e) => setEmailSchedule({...emailSchedule, recipientEmail: e.target.value})}
                      className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-900"
                      placeholder="recipient@example.com"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 light:text-gray-700 text-sm">Time to Send (24h format)</Label>
                  <div className="flex items-center mt-1">
                    <Clock className="h-4 w-4 text-slate-400 light:text-gray-500 mr-2" />
                    <Input
                      type="time"
                      value={emailSchedule.sendTime}
                      onChange={(e) => setEmailSchedule({...emailSchedule, sendTime: e.target.value})}
                      className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Report Content Options */}
              <div>
                <h3 className="text-white light:text-gray-900 font-medium mb-3">What to include in the report:</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-daily"
                      checked={emailSchedule.includeDailyReport}
                      onCheckedChange={(checked) => 
                        setEmailSchedule({...emailSchedule, includeDailyReport: !!checked})
                      }
                      className="border-slate-600 light:border-gray-400"
                    />
                    <Label htmlFor="include-daily" className="text-slate-300 light:text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Daily Report
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-weekly"
                      checked={emailSchedule.includeWeeklyReport}
                      onCheckedChange={(checked) => 
                        setEmailSchedule({...emailSchedule, includeWeeklyReport: !!checked})
                      }
                      className="border-slate-600 light:border-gray-400"
                    />
                    <Label htmlFor="include-weekly" className="text-slate-300 light:text-gray-700 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Weekly Report
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-monthly"
                      checked={emailSchedule.includeMonthlyReport}
                      onCheckedChange={(checked) => 
                        setEmailSchedule({...emailSchedule, includeMonthlyReport: !!checked})
                      }
                      className="border-slate-600 light:border-gray-400"
                    />
                    <Label htmlFor="include-monthly" className="text-slate-300 light:text-gray-700 flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Monthly Report
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-material"
                      checked={emailSchedule.includeMaterialConsumptionReport}
                      onCheckedChange={(checked) => 
                        setEmailSchedule({...emailSchedule, includeMaterialConsumptionReport: !!checked})
                      }
                      className="border-slate-600 light:border-gray-400"
                    />
                    <Label htmlFor="include-material" className="text-slate-300 light:text-gray-700 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Material Consumption Report
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-detailed"
                      checked={emailSchedule.includeDetailedReport}
                      onCheckedChange={(checked) => 
                        setEmailSchedule({...emailSchedule, includeDetailedReport: !!checked})
                      }
                      className="border-slate-600 light:border-gray-400"
                    />
                    <Label htmlFor="include-detailed" className="text-slate-300 light:text-gray-700 flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Detailed Report
                    </Label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveSchedule}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white light:bg-blue-600 light:hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                SAVE SCHEDULE
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </WaterSystemLayout>
  )
}