import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Key, Shield, LogOut, RefreshCw, Plus, Edit, Trash2, RotateCcw, Search, Filter, Copy, Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("codes");
  
  // Modal states
  const [createCodeModalOpen, setCreateCodeModalOpen] = useState(false);
  const [editCodeModalOpen, setEditCodeModalOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<any>(null);
  const [editAccessModalOpen, setEditAccessModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<string | null>(null);
  const [codeToReset, setCodeToReset] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Form states for create/edit
  const [codeFormData, setCodeFormData] = useState({
    code: "",
    userId: "",
    expiresAt: "",
    notes: "",
    autoGenerate: true
  });

  // Check if admin is authenticated on mount
  useEffect(() => {
    fetch("/api/admin/status", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          setLocation("/admin/login");
        }
      })
      .catch(() => setLocation("/admin/login"));
  }, [setLocation]);

  // Fetch users for dropdown
  const usersQuery = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/admin/login");
        }
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
    enabled: selectedTab === "codes" || selectedTab === "users",
  });

  // Fetch gateway codes with filters
  const codesQuery = useQuery({
    queryKey: ["/api/admin/gateway-codes", searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await fetch(`/api/admin/gateway-codes${params.toString() ? `?${params.toString()}` : ""}`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/admin/login");
        }
        throw new Error("Failed to fetch codes");
      }
      return response.json();
    },
    enabled: selectedTab === "codes",
  });

  // Fetch audit logs
  const auditLogsQuery = useQuery({
    queryKey: ["/api/admin/audit-logs"],
    queryFn: async () => {
      const response = await fetch("/api/admin/audit-logs", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/admin/login");
        }
        throw new Error("Failed to fetch audit logs");
      }
      return response.json();
    },
    enabled: selectedTab === "audit",
  });

  // Create code mutation
  const createCodeMutation = useMutation({
    mutationFn: async (data: typeof codeFormData) => {
      return apiRequest("POST", "/api/admin/gateway-codes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gateway-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setCreateCodeModalOpen(false);
      resetCodeForm();
      toast({
        title: "Success",
        description: "Gateway code created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create gateway code",
        variant: "destructive",
      });
    },
  });

  // Update code mutation
  const updateCodeMutation = useMutation({
    mutationFn: async ({ code, ...data }: any) => {
      return apiRequest("PUT", `/api/admin/gateway-codes/${code}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gateway-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setEditCodeModalOpen(false);
      setSelectedCode(null);
      resetCodeForm();
      toast({
        title: "Success",
        description: "Gateway code updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update gateway code",
        variant: "destructive",
      });
    },
  });

  // Reset code mutation
  const resetCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest("POST", "/api/admin/gateway-codes/reset", { code, deleteGateway: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gateway-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({
        title: "Success",
        description: "Gateway code reset successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset gateway code",
        variant: "destructive",
      });
    },
  });

  // Delete code mutation
  const deleteCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest("DELETE", `/api/admin/gateway-codes/${code}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gateway-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({
        title: "Success",
        description: "Gateway code deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete gateway code",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        toast({
          title: "Logged out",
          description: "You have been logged out successfully",
        });
        setLocation("/admin/login");
      }
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred during logout",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    if (selectedTab === "users") {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } else if (selectedTab === "codes") {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gateway-codes"] });
    } else if (selectedTab === "audit") {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
    }
    toast({
      title: "Refreshed",
      description: "Data has been refreshed",
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: "bg-green-500",
      issued: "bg-blue-500",
      used: "bg-purple-500",
      redeemed: "bg-purple-500",
      expired: "bg-red-500",
      revoked: "bg-gray-500",
    };
    return (
      <Badge className={statusColors[status] || "bg-gray-400"}>
        {status}
      </Badge>
    );
  };

  const resetCodeForm = () => {
    setCodeFormData({
      code: "",
      userId: "",
      expiresAt: "",
      notes: "",
      autoGenerate: true
    });
  };

  const handleCreateCode = () => {
    createCodeMutation.mutate(codeFormData);
  };

  const handleUpdateCode = () => {
    if (selectedCode) {
      updateCodeMutation.mutate({
        code: selectedCode.code,
        userId: codeFormData.userId || undefined,
        expiresAt: codeFormData.expiresAt || undefined,
        notes: codeFormData.notes || undefined,
        status: selectedCode.status
      });
    }
  };

  const handleEditCode = (code: any) => {
    setSelectedCode(code);
    setCodeFormData({
      code: code.code,
      userId: code.userId || "",
      expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().slice(0, 16) : "",
      notes: code.notes || "",
      autoGenerate: false
    });
    setEditCodeModalOpen(true);
  };

  const handleDeleteCode = (code: string) => {
    setCodeToDelete(code);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (codeToDelete) {
      deleteCodeMutation.mutate(codeToDelete);
      setCodeToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  const handleResetCode = (code: string) => {
    setCodeToReset(code);
    setResetConfirmOpen(true);
  };

  const confirmReset = () => {
    if (codeToReset) {
      resetCodeMutation.mutate(codeToReset);
      setCodeToReset(null);
    }
    setResetConfirmOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  // User access management handlers
  const handleQuickExtend = async (userId: string, days: number) => {
    try {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/access/extend`, { days });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: `User access extended by ${days} days`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to extend user access",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    if (window.confirm("Are you sure you want to revoke this user's access?")) {
      try {
        const response = await apiRequest("PUT", `/api/admin/users/${userId}/access`, { action: 'revoke' });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        toast({
          title: "Success",
          description: "User access has been revoked",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to revoke user access",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpdateUserAccess = async (userId: string, data: any) => {
    try {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/access`, data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditAccessModalOpen(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "User access updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user access",
        variant: "destructive",
      });
    }
  };

  // Filter codes based on search term
  const filteredCodes = codesQuery.data?.codes?.filter((code: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return code.code.toLowerCase().includes(searchLower) ||
           code.userId?.toLowerCase().includes(searchLower) ||
           code.notes?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleLogout}
              variant="destructive"
              size="sm"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="codes" data-testid="tab-codes">
              <Key className="h-4 w-4 mr-2" />
              Gateway Codes
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <Shield className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage registered users and their access durations</CardDescription>
              </CardHeader>
              <CardContent>
                {usersQuery.isLoading ? (
                  <div className="text-center py-4">Loading users...</div>
                ) : usersQuery.error ? (
                  <div className="text-red-500 text-center py-4">Error loading users</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Access Expires</TableHead>
                        <TableHead>Days Remaining</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersQuery.data?.users?.map((user: any) => {
                        const getAccessStatusBadge = () => {
                          if (user.accessStatus === 'expired') {
                            return (
                              <Badge className="bg-red-500">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Expired
                              </Badge>
                            );
                          }
                          if (user.accessStatus === 'expiring') {
                            return (
                              <Badge className="bg-yellow-500">
                                <Clock className="h-3 w-3 mr-1" />
                                Expiring Soon
                              </Badge>
                            );
                          }
                          return (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          );
                        };

                        const getDaysRemainingDisplay = () => {
                          if (user.daysRemaining === null) {
                            return <span className="text-muted-foreground">Unlimited</span>;
                          }
                          if (user.daysRemaining < 0) {
                            return <span className="text-red-500">Expired {Math.abs(user.daysRemaining)} days ago</span>;
                          }
                          if (user.daysRemaining === 0) {
                            return <span className="text-red-500">Expires today</span>;
                          }
                          if (user.daysRemaining <= 7) {
                            return <span className="text-yellow-500">{user.daysRemaining} days</span>;
                          }
                          return <span>{user.daysRemaining} days</span>;
                        };

                        return (
                          <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>
                              {user.firstName || user.lastName 
                                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                : "N/A"}
                            </TableCell>
                            <TableCell>{user.companyName || "N/A"}</TableCell>
                            <TableCell>{formatDate(user.createdAt)}</TableCell>
                            <TableCell>
                              {user.accessExpiresAt 
                                ? formatDate(user.accessExpiresAt)
                                : <span className="text-muted-foreground">Not set</span>}
                            </TableCell>
                            <TableCell>{getDaysRemainingDisplay()}</TableCell>
                            <TableCell>{getAccessStatusBadge()}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setEditAccessModalOpen(true);
                                  }}
                                  data-testid={`button-edit-access-${user.id}`}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit Access
                                </Button>
                                <Select
                                  onValueChange={(value) => {
                                    if (value === 'extend-7') {
                                      handleQuickExtend(user.id, 7);
                                    } else if (value === 'extend-30') {
                                      handleQuickExtend(user.id, 30);
                                    } else if (value === 'revoke') {
                                      handleRevokeAccess(user.id);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-[120px]" data-testid={`select-quick-action-${user.id}`}>
                                    <SelectValue placeholder="Quick actions" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="extend-7">Extend 7 days</SelectItem>
                                    <SelectItem value="extend-30">Extend 30 days</SelectItem>
                                    <SelectItem value="revoke" className="text-red-600">Revoke Access</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gateway Activation Codes</CardTitle>
                    <CardDescription>Manage gateway activation codes</CardDescription>
                  </div>
                  <Button
                    onClick={() => setCreateCodeModalOpen(true)}
                    size="sm"
                    data-testid="button-create-code"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Code
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search codes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-codes"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                      <SelectItem value="redeemed">Redeemed</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {codesQuery.isLoading ? (
                  <div className="text-center py-4">Loading codes...</div>
                ) : codesQuery.error ? (
                  <div className="text-red-500 text-center py-4">Error loading codes</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Machine ID</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {codesQuery.data?.codes?.map((code: any) => (
                        <TableRow key={code.id} data-testid={`code-row-${code.id}`}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              {code.code}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(code.code)}
                                data-testid={`button-copy-${code.id}`}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{code.userId || "N/A"}</TableCell>
                          <TableCell>{getStatusBadge(code.status)}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {code.machineId ? code.machineId.substring(0, 8) + "..." : "Not bound"}
                          </TableCell>
                          <TableCell>{formatDate(code.createdAt)}</TableCell>
                          <TableCell>{formatDate(code.expiresAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCode(code)}
                                data-testid={`button-edit-${code.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {code.status === 'redeemed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResetCode(code.code)}
                                  data-testid={`button-reset-${code.id}`}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCode(code.code)}
                                className="text-red-500 hover:text-red-700"
                                data-testid={`button-delete-${code.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>Gateway activation and system audit logs</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogsQuery.isLoading ? (
                  <div className="text-center py-4">Loading audit logs...</div>
                ) : auditLogsQuery.error ? (
                  <div className="text-red-500 text-center py-4">Error loading audit logs</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Gateway ID</TableHead>
                        <TableHead>Success</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogsQuery.data?.logs?.map((log: any) => (
                        <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                          <TableCell>{formatDate(log.created_at)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell>{log.user_id || "N/A"}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.gateway_id ? log.gateway_id.substring(0, 12) + "..." : "N/A"}
                          </TableCell>
                          <TableCell>
                            {log.success ? (
                              <Badge className="bg-green-500">Success</Badge>
                            ) : (
                              <Badge className="bg-red-500">Failed</Badge>
                            )}
                          </TableCell>
                          <TableCell>{log.ip_address || "N/A"}</TableCell>
                          <TableCell className="text-xs text-red-400">
                            {log.error_message || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Code Modal */}
        <Dialog open={createCodeModalOpen} onOpenChange={setCreateCodeModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Gateway Code</DialogTitle>
              <DialogDescription>
                Create a new activation code for gateway registration
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {codeFormData.autoGenerate ? (
                <div className="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded">
                  <Key className="h-5 w-5 mr-2 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Code will be auto-generated
                  </span>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={codeFormData.code}
                    onChange={(e) => setCodeFormData({ ...codeFormData, code: e.target.value })}
                    placeholder="HERC-XXXX-XXXX-XXXX-XXXX"
                    data-testid="input-code"
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoGenerate"
                  checked={codeFormData.autoGenerate}
                  onChange={(e) => setCodeFormData({ ...codeFormData, autoGenerate: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="autoGenerate">Auto-generate code</Label>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="userId">Assign to User (Optional)</Label>
                <Select 
                  value={codeFormData.userId}
                  onValueChange={(value) => setCodeFormData({ ...codeFormData, userId: value })}
                >
                  <SelectTrigger data-testid="select-user">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No user assigned</SelectItem>
                    {usersQuery.data?.users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} ({user.name || "No name"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="expiresAt">Expiration Date</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={codeFormData.expiresAt}
                  onChange={(e) => setCodeFormData({ ...codeFormData, expiresAt: e.target.value })}
                  data-testid="input-expires-at"
                />
                <p className="text-xs text-gray-500">Leave empty for 30 days default</p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={codeFormData.notes}
                  onChange={(e) => setCodeFormData({ ...codeFormData, notes: e.target.value })}
                  placeholder="Optional notes about this code"
                  data-testid="textarea-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateCodeModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCode} 
                disabled={createCodeMutation.isPending}
                data-testid="button-create-submit"
              >
                {createCodeMutation.isPending ? "Creating..." : "Create Code"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Code Modal */}
        <Dialog open={editCodeModalOpen} onOpenChange={setEditCodeModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Gateway Code</DialogTitle>
              <DialogDescription>
                Update gateway code details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Code</Label>
                <Input
                  value={codeFormData.code}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-userId">Assign to User</Label>
                <Select 
                  value={codeFormData.userId}
                  onValueChange={(value) => setCodeFormData({ ...codeFormData, userId: value })}
                >
                  <SelectTrigger data-testid="select-edit-user">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No user assigned</SelectItem>
                    {usersQuery.data?.users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} ({user.name || "No name"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-expiresAt">Expiration Date</Label>
                <Input
                  id="edit-expiresAt"
                  type="datetime-local"
                  value={codeFormData.expiresAt}
                  onChange={(e) => setCodeFormData({ ...codeFormData, expiresAt: e.target.value })}
                  data-testid="input-edit-expires-at"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={codeFormData.notes}
                  onChange={(e) => setCodeFormData({ ...codeFormData, notes: e.target.value })}
                  placeholder="Optional notes about this code"
                  data-testid="textarea-edit-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditCodeModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateCode} 
                disabled={updateCodeMutation.isPending}
                data-testid="button-edit-submit"
              >
                {updateCodeMutation.isPending ? "Updating..." : "Update Code"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the gateway code
                <span className="font-mono font-bold block mt-2">{codeToDelete}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600"
                data-testid="button-confirm-delete"
              >
                Delete Code
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Gateway Code?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset the code back to "issued" status, clearing all machine bindings and gateway associations.
                <span className="font-mono font-bold block mt-2">{codeToReset}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmReset}
                data-testid="button-confirm-reset"
              >
                Reset Code
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit User Access Dialog */}
        <Dialog open={editAccessModalOpen} onOpenChange={setEditAccessModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit User Access</DialogTitle>
              <DialogDescription>
                Manage access duration for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="grid gap-4 py-4">
                {/* Current Status */}
                <div className="grid gap-2">
                  <Label>Current Status</Label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Access Expires:</span>
                      <span className="text-sm font-medium">
                        {selectedUser.accessExpiresAt ? formatDate(selectedUser.accessExpiresAt) : "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Days Remaining:</span>
                      <span className="text-sm font-medium">
                        {selectedUser.daysRemaining !== null 
                          ? (selectedUser.daysRemaining < 0 
                              ? `Expired ${Math.abs(selectedUser.daysRemaining)} days ago` 
                              : `${selectedUser.daysRemaining} days`)
                          : "Unlimited"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                      {selectedUser.accessStatus === 'expired' ? (
                        <Badge className="bg-red-500 text-xs">Expired</Badge>
                      ) : selectedUser.accessStatus === 'expiring' ? (
                        <Badge className="bg-yellow-500 text-xs">Expiring Soon</Badge>
                      ) : (
                        <Badge className="bg-green-500 text-xs">Active</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Duration Options */}
                <div className="grid gap-2">
                  <Label>Grant Access Duration</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[7, 15, 30, 90, 180, 365].map((days) => (
                      <Button
                        key={days}
                        variant="outline"
                        onClick={() => {
                          const expiresAt = new Date();
                          expiresAt.setDate(expiresAt.getDate() + days);
                          handleUpdateUserAccess(selectedUser.id, { 
                            action: 'set', 
                            expiresAt: expiresAt.toISOString() 
                          });
                        }}
                        data-testid={`button-grant-${days}`}
                      >
                        {days} days
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Picker */}
                <div className="grid gap-2">
                  <Label htmlFor="custom-expiry">Set Custom Expiry Date</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-expiry"
                      type="datetime-local"
                      className="flex-1"
                      data-testid="input-custom-expiry"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById('custom-expiry') as HTMLInputElement;
                        if (input.value) {
                          handleUpdateUserAccess(selectedUser.id, { 
                            action: 'set', 
                            expiresAt: new Date(input.value).toISOString() 
                          });
                        }
                      }}
                      data-testid="button-set-custom"
                    >
                      Set
                    </Button>
                  </div>
                </div>

                {/* Extend by N Days */}
                <div className="grid gap-2">
                  <Label htmlFor="extend-days">Extend Access By Days</Label>
                  <div className="flex gap-2">
                    <Input
                      id="extend-days"
                      type="number"
                      placeholder="Number of days to extend"
                      className="flex-1"
                      data-testid="input-extend-days"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById('extend-days') as HTMLInputElement;
                        const days = parseInt(input.value);
                        if (days > 0) {
                          handleUpdateUserAccess(selectedUser.id, { 
                            action: 'extend', 
                            days 
                          });
                        }
                      }}
                      data-testid="button-extend-custom"
                    >
                      Extend
                    </Button>
                  </div>
                </div>

                {/* Revoke Access */}
                <div className="border-t pt-4">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to revoke this user's access immediately?")) {
                        handleUpdateUserAccess(selectedUser.id, { action: 'revoke' });
                      }
                    }}
                    data-testid="button-revoke-access"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Revoke Access Immediately
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditAccessModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}