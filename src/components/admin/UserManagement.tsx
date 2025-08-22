import { useState, useEffect } from 'react'
import { useKV } from '../../hooks/useKV'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Pencil, Trash, UserCheck, UserMinus, Download, Funnel, MagnifyingGlass, CaretDown, CaretRight, Users } from '@phosphor-icons/react'
import { User, UserRole, Trainee, Faculty } from '../../lib/types'
import { toast } from 'sonner'

interface UserFormData {
  email: string
  name: string
  role: UserRole
  cohort?: string
  startDate?: string
  department?: string
  specialties?: string[]
  isActive: boolean
}

interface CohortData {
  id: string
  name: string
  year: number
  startDate: string
  isActive: boolean
  traineeCount: number
  traineeIds?: string[]
}

export function UserManagement() {
  const [users, setUsers] = useKV<User[]>('users', [])
  const [cohorts, setCohorts] = useKV<CohortData[]>('cohorts', [])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all')
  const [selectedCohort, setSelectedCohort] = useState<string>('all')
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isCreateCohortOpen, setIsCreateCohortOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingCohort, setEditingCohort] = useState<CohortData | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'cohorts'>('users')
  const [isTraineesOpen, setIsTraineesOpen] = useState(true)
  const [isFacultyOpen, setIsFacultyOpen] = useState(true)
  const [selectedTraineesForCohort, setSelectedTraineesForCohort] = useState<string[]>([])
  const [manageCohortDialog, setManageCohortDialog] = useState<CohortData | null>(null)

  const [userForm, setUserForm] = useState<UserFormData>({
    email: '',
    name: '',
    role: 'trainee',
    isActive: true
  })

  const [cohortForm, setCohortForm] = useState({
    name: '',
    year: new Date().getFullYear(),
    startDate: '',
    isActive: true
  })

  // Sample data initialization
  useEffect(() => {
    if (users.length === 0) {
      const sampleUsers: User[] = [
        {
          id: '1',
          email: 'john.faculty@hospital.edu',
          name: 'Dr. John Smith',
          role: 'faculty',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          email: 'jane.resident@hospital.edu',
          name: 'Jane Doe',
          role: 'trainee',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cohort: 'PGY-1 2024',
          startDate: '2024-07-01'
        },
        {
          id: '3',
          email: 'mike.resident@hospital.edu',
          name: 'Michael Johnson',
          role: 'trainee',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cohort: 'PGY-1 2024',
          startDate: '2024-07-01'
        },
        {
          id: '4',
          email: 'sarah.resident@hospital.edu',
          name: 'Sarah Wilson',
          role: 'trainee',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '5',
          email: 'lisa.leadership@hospital.edu',
          name: 'Dr. Lisa Brown',
          role: 'leadership',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '6',
          email: 'tom.resident@hospital.edu',
          name: 'Thomas Miller',
          role: 'trainee',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cohort: 'PGY-2 2023',
          startDate: '2023-07-01'
        }
      ]
      setUsers(sampleUsers)
    }

    if (cohorts.length === 0) {
      const sampleCohorts: CohortData[] = [
        {
          id: '1',
          name: 'PGY-1 2024',
          year: 2024,
          startDate: '2024-07-01',
          isActive: true,
          traineeCount: 2,
          traineeIds: ['2', '3']
        },
        {
          id: '2', 
          name: 'PGY-2 2023',
          year: 2023,
          startDate: '2023-07-01',
          isActive: true,
          traineeCount: 1,
          traineeIds: ['6']
        },
        {
          id: '3',
          name: 'PGY-3 2022',
          year: 2022,
          startDate: '2022-07-01',
          isActive: true,
          traineeCount: 0,
          traineeIds: []
        }
      ]
      setCohorts(sampleCohorts)
    }
  }, [users.length, cohorts.length, setUsers, setCohorts])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    const matchesCohort = selectedCohort === 'all' || 
                         (user.role === 'trainee' && user.cohort === selectedCohort)
    return matchesSearch && matchesRole && matchesCohort
  })

  const trainees = filteredUsers.filter(user => user.role === 'trainee')
  const faculty = filteredUsers.filter(user => user.role === 'faculty' || user.role === 'leadership')
  const admins = filteredUsers.filter(user => user.role === 'admin' || user.role === 'system-admin')

  const availableTrainees = users.filter(user => user.role === 'trainee')

  const handleCreateUser = () => {
    if (!userForm.email || !userForm.name) {
      toast.error('Please fill in required fields')
      return
    }

    const newUser: User = {
      id: Date.now().toString(),
      email: userForm.email,
      name: userForm.name,
      role: userForm.role,
      isActive: userForm.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Add role-specific fields
    if (userForm.role === 'trainee' && userForm.cohort && userForm.startDate) {
      Object.assign(newUser, {
        cohort: userForm.cohort,
        startDate: userForm.startDate
      })
    }

    setUsers(currentUsers => [...currentUsers, newUser])
    resetUserForm()
    setIsCreateUserOpen(false)
    toast.success('User created successfully')
  }

  const handleUpdateUser = () => {
    if (!editingUser || !userForm.email || !userForm.name) {
      toast.error('Please fill in required fields')
      return
    }

    setUsers(currentUsers => 
      currentUsers.map(user => 
        user.id === editingUser.id 
          ? { 
              ...user, 
              ...userForm,
              updatedAt: new Date().toISOString()
            }
          : user
      )
    )
    
    setEditingUser(null)
    resetUserForm()
    toast.success('User updated successfully')
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(currentUsers => currentUsers.filter(user => user.id !== userId))
    toast.success('User deleted successfully')
  }

  const handleToggleUserStatus = (userId: string) => {
    setUsers(currentUsers =>
      currentUsers.map(user =>
        user.id === userId
          ? { ...user, isActive: !user.isActive, updatedAt: new Date().toISOString() }
          : user
      )
    )
    toast.success('User status updated')
  }

  const handleCreateCohort = () => {
    if (!cohortForm.name || !cohortForm.startDate) {
      toast.error('Please fill in required fields')
      return
    }

    const newCohort: CohortData = {
      id: Date.now().toString(),
      name: cohortForm.name,
      year: cohortForm.year,
      startDate: cohortForm.startDate,
      isActive: cohortForm.isActive,
      traineeCount: 0
    }

    setCohorts(currentCohorts => [...currentCohorts, newCohort])
    resetCohortForm()
    setIsCreateCohortOpen(false)
    toast.success('Cohort created successfully')
  }

  const handleUpdateCohort = () => {
    if (!editingCohort || !cohortForm.name || !cohortForm.startDate) {
      toast.error('Please fill in required fields')
      return
    }

    setCohorts(currentCohorts =>
      currentCohorts.map(cohort =>
        cohort.id === editingCohort.id
          ? { ...cohort, ...cohortForm }
          : cohort
      )
    )

    setEditingCohort(null)
    resetCohortForm()
    toast.success('Cohort updated successfully')
  }

  const handleManageCohortTrainees = () => {
    if (!manageCohortDialog) return

    // Update users' cohort assignments
    setUsers(currentUsers =>
      currentUsers.map(user => {
        if (user.role === 'trainee') {
          const isSelected = selectedTraineesForCohort.includes(user.id)
          const currentCohort = user.cohort
          
          if (isSelected && currentCohort !== manageCohortDialog.name) {
            // Add to cohort
            return { ...user, cohort: manageCohortDialog.name }
          } else if (!isSelected && currentCohort === manageCohortDialog.name) {
            // Remove from cohort
            const { cohort, ...userWithoutCohort } = user
            return userWithoutCohort
          }
        }
        return user
      })
    )

    // Update cohort's trainee count and IDs
    setCohorts(currentCohorts =>
      currentCohorts.map(cohort =>
        cohort.id === manageCohortDialog.id
          ? {
              ...cohort,
              traineeCount: selectedTraineesForCohort.length,
              traineeIds: selectedTraineesForCohort
            }
          : cohort
      )
    )

    setManageCohortDialog(null)
    setSelectedTraineesForCohort([])
    toast.success('Cohort trainees updated successfully')
  }

  const openManageCohortTrainees = (cohort: CohortData) => {
    setManageCohortDialog(cohort)
    // Get current trainees in this cohort
    const currentTrainees = users
      .filter(user => user.role === 'trainee' && user.cohort === cohort.name)
      .map(user => user.id)
    setSelectedTraineesForCohort(currentTrainees)
  }

  const toggleTraineeSelection = (traineeId: string) => {
    setSelectedTraineesForCohort(current =>
      current.includes(traineeId)
        ? current.filter(id => id !== traineeId)
        : [...current, traineeId]
    )
  }

  const handleDeleteCohort = (cohortId: string) => {
    setCohorts(currentCohorts => currentCohorts.filter(cohort => cohort.id !== cohortId))
    toast.success('Cohort deleted successfully')
  }

  const resetUserForm = () => {
    setUserForm({
      email: '',
      name: '',
      role: 'trainee',
      isActive: true
    })
  }

  const resetCohortForm = () => {
    setCohortForm({
      name: '',
      year: new Date().getFullYear(),
      startDate: '',
      isActive: true
    })
  }

  const openEditUser = (user: User) => {
    setEditingUser(user)
    setUserForm({
      email: user.email,
      name: user.name,
      role: user.role,
      cohort: user.cohort,
      startDate: user.startDate,
      department: user.department,
      specialties: user.specialties,
      isActive: user.isActive
    })
  }

  const openEditCohort = (cohort: CohortData) => {
    setEditingCohort(cohort)
    setCohortForm({
      name: cohort.name,
      year: cohort.year,
      startDate: cohort.startDate,
      isActive: cohort.isActive
    })
  }

  const exportUserData = () => {
    const csvData = users.map(user => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      Role: user.role,
      Status: user.isActive ? 'Active' : 'Inactive',
      Created: new Date(user.createdAt).toLocaleDateString(),
      Cohort: (user as any).cohort || ''
    }))
    
    const headers = Object.keys(csvData[0]).join(',')
    const csvContent = [headers, ...csvData.map(row => Object.values(row).join(','))].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    
    toast.success('User data exported successfully')
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
      case 'system-admin':
        return 'destructive'
      case 'leadership':
        return 'default'
      case 'faculty':
        return 'secondary'
      case 'trainee':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const UserFormFields = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right">Email *</Label>
        <Input
          id="email"
          value={userForm.email}
          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
          className="col-span-3"
          placeholder="user@hospital.edu"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">Name *</Label>
        <Input
          id="name"
          value={userForm.name}
          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
          className="col-span-3"
          placeholder="John Doe"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="role" className="text-right">Role *</Label>
        <Select
          value={userForm.role}
          onValueChange={(value: UserRole) => setUserForm({ ...userForm, role: value })}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trainee">Trainee</SelectItem>
            <SelectItem value="faculty">Faculty</SelectItem>
            <SelectItem value="leadership">Leadership</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {userForm.role === 'trainee' && (
        <>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cohort" className="text-right">Cohort</Label>
            <Select
              value={userForm.cohort || ''}
              onValueChange={(value) => setUserForm({ ...userForm, cohort: value === 'none' ? undefined : value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select cohort (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No cohort</SelectItem>
                {cohorts.filter(c => c.isActive).map(cohort => (
                  <SelectItem key={cohort.id} value={cohort.name}>
                    {cohort.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={userForm.startDate || ''}
              onChange={(e) => setUserForm({ ...userForm, startDate: e.target.value })}
              className="col-span-3"
            />
          </div>
        </>
      )}


    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and cohorts in the system
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportUserData} variant="outline" size="sm">
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'users' | 'cohorts')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* User Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Funnel size={20} />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Search Users</Label>
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} />
                    <Input
                      id="search"
                      placeholder="Search by name or email"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="role-filter">Filter by Role</Label>
                  <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | 'all')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="trainee">Trainee</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="leadership">Leadership</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="system-admin">System Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cohort-filter">Filter by Cohort</Label>
                  <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cohorts</SelectItem>
                      {cohorts.map(cohort => (
                        <SelectItem key={cohort.id} value={cohort.name}>
                          {cohort.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List with Collapsible Sections */}
          <div className="space-y-6">
            {/* Trainees Section */}
            <Collapsible open={isTraineesOpen} onOpenChange={setIsTraineesOpen}>
              <div className="flex justify-between items-center">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto font-semibold text-xl">
                    <div className="flex items-center gap-2">
                      {isTraineesOpen ? <CaretDown size={20} /> : <CaretRight size={20} />}
                      <Users size={20} />
                      Trainees ({trainees.length})
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      resetUserForm()
                      setUserForm(prev => ({ ...prev, role: 'trainee' }))
                    }} size="sm">
                      <Plus size={16} />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                    </DialogHeader>
                    <UserFormFields />
                    <DialogFooter>
                      <Button type="submit" onClick={handleCreateUser}>Create User</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <CollapsibleContent className="space-y-4">
                {trainees.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      No trainees found matching the current filters.
                    </CardContent>
                  </Card>
                ) : (
                  trainees.map((user) => (
                    <Card key={user.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{user.name}</h3>
                              <Badge variant={getRoleBadgeColor(user.role)}>
                                {user.role}
                              </Badge>
                              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.cohort && (
                              <p className="text-sm text-muted-foreground">
                                Cohort: {user.cohort}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user.id)}
                            >
                              {user.isActive ? <UserMinus size={16} /> : <UserCheck size={16} />}
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
                                  <Pencil size={16} />
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Trainee</DialogTitle>
                                  <DialogDescription>
                                    Update trainee information and settings.
                                  </DialogDescription>
                                </DialogHeader>
                                <UserFormFields />
                                <DialogFooter>
                                  <Button type="submit" onClick={handleUpdateUser}>Update Trainee</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash size={16} />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Trainee</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Faculty Section */}
            <Collapsible open={isFacultyOpen} onOpenChange={setIsFacultyOpen}>
              <div className="flex justify-between items-center">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto font-semibold text-xl">
                    <div className="flex items-center gap-2">
                      {isFacultyOpen ? <CaretDown size={20} /> : <CaretRight size={20} />}
                      <Users size={20} />
                      Faculty & Leadership ({faculty.length})
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      resetUserForm()
                      setUserForm(prev => ({ ...prev, role: 'faculty' }))
                    }} size="sm">
                      <Plus size={16} />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                    </DialogHeader>
                    <UserFormFields />
                    <DialogFooter>
                      <Button type="submit" onClick={handleCreateUser}>Create User</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <CollapsibleContent className="space-y-4">
                {faculty.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      No faculty members found matching the current filters.
                    </CardContent>
                  </Card>
                ) : (
                  faculty.map((user) => (
                    <Card key={user.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{user.name}</h3>
                              <Badge variant={getRoleBadgeColor(user.role)}>
                                {user.role}
                              </Badge>
                              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user.id)}
                            >
                              {user.isActive ? <UserMinus size={16} /> : <UserCheck size={16} />}
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
                                  <Pencil size={16} />
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Faculty</DialogTitle>
                                  <DialogDescription>
                                    Update faculty information and settings.
                                  </DialogDescription>
                                </DialogHeader>
                                <UserFormFields />
                                <DialogFooter>
                                  <Button type="submit" onClick={handleUpdateUser}>Update Faculty</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash size={16} />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Faculty</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Admin Section (if any admins exist) */}
            {admins.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Administrators ({admins.length})</h2>
                  <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        resetUserForm()
                        setUserForm(prev => ({ ...prev, role: 'admin' }))
                      }} size="sm">
                        <Plus size={16} />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                      </DialogHeader>
                      <UserFormFields />
                      <DialogFooter>
                        <Button type="submit" onClick={handleCreateUser}>Create User</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {admins.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{user.name}</h3>
                            <Badge variant={getRoleBadgeColor(user.role)}>
                              {user.role}
                            </Badge>
                            <Badge variant={user.isActive ? 'default' : 'secondary'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(user.id)}
                          >
                            {user.isActive ? <UserMinus size={16} /> : <UserCheck size={16} />}
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
                                <Pencil size={16} />
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Edit Administrator</DialogTitle>
                                <DialogDescription>
                                  Update administrator information and settings.
                                </DialogDescription>
                              </DialogHeader>
                              <UserFormFields />
                              <DialogFooter>
                                <Button type="submit" onClick={handleUpdateUser}>Update Admin</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash size={16} />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Administrator</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Cohorts ({cohorts.length})</h2>
            <Dialog open={isCreateCohortOpen} onOpenChange={setIsCreateCohortOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetCohortForm}>
                  <Plus size={16} />
                  Add Cohort
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Cohort</DialogTitle>
                  <DialogDescription>
                    Add a new trainee cohort to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cohort-name" className="text-right">Name</Label>
                    <Input
                      id="cohort-name"
                      value={cohortForm.name}
                      onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                      className="col-span-3"
                      placeholder="PGY-1 2024"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cohort-year" className="text-right">Year</Label>
                    <Input
                      id="cohort-year"
                      type="number"
                      value={cohortForm.year}
                      onChange={(e) => setCohortForm({ ...cohortForm, year: parseInt(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cohort-start" className="text-right">Start Date</Label>
                    <Input
                      id="cohort-start"
                      type="date"
                      value={cohortForm.startDate}
                      onChange={(e) => setCohortForm({ ...cohortForm, startDate: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateCohort}>Create Cohort</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {cohorts.map((cohort) => (
              <Card key={cohort.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{cohort.name}</h3>
                        <Badge variant={cohort.isActive ? 'default' : 'secondary'}>
                          {cohort.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Start Date: {new Date(cohort.startDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Trainees: {cohort.traineeCount}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openManageCohortTrainees(cohort)}
                      >
                        <Users size={16} />
                        Manage Trainees
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => openEditCohort(cohort)}>
                            <Pencil size={16} />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit Cohort</DialogTitle>
                            <DialogDescription>
                              Update cohort information.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="edit-cohort-name" className="text-right">Name</Label>
                              <Input
                                id="edit-cohort-name"
                                value={cohortForm.name}
                                onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="edit-cohort-year" className="text-right">Year</Label>
                              <Input
                                id="edit-cohort-year"
                                type="number"
                                value={cohortForm.year}
                                onChange={(e) => setCohortForm({ ...cohortForm, year: parseInt(e.target.value) })}
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="edit-cohort-start" className="text-right">Start Date</Label>
                              <Input
                                id="edit-cohort-start"
                                type="date"
                                value={cohortForm.startDate}
                                onChange={(e) => setCohortForm({ ...cohortForm, startDate: e.target.value })}
                                className="col-span-3"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit" onClick={handleUpdateCohort}>Update Cohort</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash size={16} />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Cohort</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {cohort.name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCohort(cohort.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Manage Cohort Trainees Dialog */}
      {manageCohortDialog && (
        <Dialog open={!!manageCohortDialog} onOpenChange={() => setManageCohortDialog(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Trainees - {manageCohortDialog.name}</DialogTitle>
              <DialogDescription>
                Select trainees to add or remove from this cohort. Selected trainees will be assigned to this cohort.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground">
                {selectedTraineesForCohort.length} of {availableTrainees.length} trainees selected
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableTrainees.map((trainee) => {
                  const isSelected = selectedTraineesForCohort.includes(trainee.id)
                  const currentCohort = trainee.cohort
                  
                  return (
                    <div
                      key={trainee.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleTraineeSelection(trainee.id)}
                        id={`trainee-${trainee.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`trainee-${trainee.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {trainee.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {trainee.email}
                        </p>
                        {currentCohort && (
                          <p className="text-xs text-muted-foreground">
                            Current cohort: {currentCohort}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={trainee.isActive ? 'default' : 'secondary'} className="text-xs">
                          {trainee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {currentCohort && currentCohort !== manageCohortDialog.name && (
                          <Badge variant="outline" className="text-xs">
                            {currentCohort}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {availableTrainees.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No trainees available in the system.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManageCohortDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleManageCohortTrainees}>
                Update Cohort ({selectedTraineesForCohort.length} trainees)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}