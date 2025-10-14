'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { MFASetup } from '@/components/auth/mfa-setup';
import { User, Shield, Bell, Palette } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Manage your account preferences, security, and notification settings.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2 bg-green-50 md:grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center justify-center gap-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center justify-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center justify-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center justify-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Appearance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-green-200 shadow-sm">
              <div className="space-y-4 p-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Profile Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Update your personal information and contact details.
                  </p>
                </div>
                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      defaultValue={user?.first_name}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      defaultValue={user?.last_name}
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user?.email}
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    defaultValue={user?.username}
                    disabled
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      defaultValue={user?.phone || ''}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      defaultValue={user?.position || ''}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button disabled>
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="border-green-200 shadow-sm">
              <div className="space-y-4 p-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Password</h3>
                  <p className="text-sm text-muted-foreground">
                    Change your account password.
                  </p>
                </div>
                <Separator />

                <div className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button disabled>
                    Update Password
                  </Button>
                </div>
              </div>
            </Card>

            <MFASetup />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="border-green-200 shadow-sm">
              <div className="space-y-4 p-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Notification Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage how you receive notifications.
                  </p>
                </div>
                <Separator />

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Notification settings are not yet available.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card className="border-green-200 shadow-sm">
              <div className="space-y-4 p-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Appearance Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize the look and feel of your dashboard.
                  </p>
                </div>
                <Separator />

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Appearance settings are not yet available.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
