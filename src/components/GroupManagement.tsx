'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Users, Crown, Copy, Check, UserPlus, Building2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RestaurantGroup {
  id: string;
  group_name: string;
  group_code: string;
  created_by: string;
  created_at: Date;
  restaurants: Array<{
    id: string;
    name: string;
    joined_at: Date;
    is_admin: boolean;
  }>;
}

interface GroupManagementProps {
  tenantId: string;
  tenantName?: string;
  onGroupChanged?: () => void;
}

export default function GroupManagement({ tenantId, tenantName, onGroupChanged }: GroupManagementProps) {
  const [group, setGroup] = useState<RestaurantGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  
  // Form states
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadGroup();
  }, [tenantId]);

  const loadGroup = async () => {
    try {
      const response = await fetch(`/api/admin/groups?tenantId=${tenantId}`);
      const data = await response.json();
      
      if (data.success) {
        setGroup(data.group);
      }
    } catch (error) {
      console.error('Failed to load group:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/admin/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: groupName.trim(),
          tenantId,
          createdBy: tenantId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Group created! Share code: ${data.groupCode}`
        });
        setGroupName('');
        loadGroup();
        onGroupChanged?.();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const joinGroup = async () => {
    if (!joinCode.trim() || joinCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-character group code",
        variant: "destructive"
      });
      return;
    }

    setJoining(true);
    try {
      const response = await fetch('/api/admin/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupCode: joinCode.trim().toUpperCase(),
          tenantId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Successfully joined the group!"
        });
        setJoinCode('');
        loadGroup();
        onGroupChanged?.();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join group",
        variant: "destructive"
      });
    } finally {
      setJoining(false);
    }
  };

  const leaveGroup = async () => {
    if (!group) return;

    setLeaving(true);
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: group.id,
          tenantId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Left the group successfully"
        });
        setGroup(null);
        onGroupChanged?.();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to leave group",
        variant: "destructive"
      });
    } finally {
      setLeaving(false);
    }
  };

  const copyGroupCode = async () => {
    if (!group) return;
    
    try {
      await navigator.clipboard.writeText(group.group_code);
      setCodeCopied(true);
      toast({
        title: "Copied!",
        description: "Group code copied to clipboard"
      });
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy group code",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {group ? (
        // Display current group
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>{group.group_name}</CardTitle>
                {group.created_by === tenantId && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <Crown className="h-3 w-3" />
                    <span>Owner</span>
                  </Badge>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyGroupCode}
                className="flex items-center space-x-2"
              >
                {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{group.group_code}</span>
              </Button>
            </div>
            <CardDescription>
              Multi-location restaurant group for centralized reporting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Group Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{group.restaurants.length}</div>
                <div className="text-sm text-blue-600">Restaurants</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {group.restaurants.filter(r => r.is_admin).length}
                </div>
                <div className="text-sm text-green-600">Admins</div>
              </div>
            </div>

            <Separator />

            {/* Restaurant List */}
            <div>
              <h4 className="font-medium mb-3 flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Group Members</span>
              </h4>
              <div className="space-y-2">
                {group.restaurants.map((restaurant) => (
                  <div 
                    key={restaurant.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{restaurant.name}</div>
                        <div className="text-sm text-gray-500 flex items-center space-x-2">
                          <Calendar className="h-3 w-3" />
                          <span>Joined {new Date(restaurant.joined_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {restaurant.is_admin && (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <Crown className="h-3 w-3" />
                          <span>Admin</span>
                        </Badge>
                      )}
                      {restaurant.id === tenantId && (
                        <Badge variant="outline">You</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Group Actions */}
            <div className="flex justify-between items-center">
              <Alert>
                <AlertDescription>
                  {group.created_by === tenantId 
                    ? "Share the group code with other restaurants to invite them to join your group."
                    : "You can view reports from all restaurants in this group."}
                </AlertDescription>
              </Alert>
              
              {group.created_by !== tenantId && (
                <Button 
                  variant="destructive" 
                  onClick={leaveGroup}
                  disabled={leaving}
                >
                  {leaving ? 'Leaving...' : 'Leave Group'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        // No group - show create/join options
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Group */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Create New Group</span>
              </CardTitle>
              <CardDescription>
                Create a restaurant group to manage multiple locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  placeholder="e.g., Pizza Palace Locations"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createGroup()}
                />
              </div>
              <Button 
                onClick={createGroup} 
                disabled={creating || !groupName.trim()}
                className="w-full"
              >
                {creating ? 'Creating...' : 'Create Group'}
              </Button>
              <Alert>
                <AlertDescription>
                  You'll become the group owner and get a unique code to share with other restaurants.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Join Group */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Join Existing Group</span>
              </CardTitle>
              <CardDescription>
                Enter a group code to join an existing restaurant group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="joinCode">Group Code</Label>
                <Input
                  id="joinCode"
                  placeholder="Enter 6-character code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && joinGroup()}
                  maxLength={6}
                />
              </div>
              <Button 
                onClick={joinGroup} 
                disabled={joining || joinCode.length !== 6}
                className="w-full"
              >
                {joining ? 'Joining...' : 'Join Group'}
              </Button>
              <Alert>
                <AlertDescription>
                  Ask the group owner for the 6-character group code to join their restaurant group.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
