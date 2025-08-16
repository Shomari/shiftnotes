import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { EPA } from '../../lib/types'
import { Plus, Pencil, Trash, Save, X, CaretDown } from '@phosphor-icons/react'

export function EPABankManagement() {
  const [epas, setEPAs] = useKV<EPA[]>('epas', [])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEPA, setEditingEPA] = useState<EPA | null>(null)
  const [activeEPAsOpen, setActiveEPAsOpen] = useState(true)
  const [inactiveEPAsOpen, setInactiveEPAsOpen] = useState(false)
  const [categoriesSectionOpen, setCategoriesSectionOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    category: '',
    isActive: true
  })

  // Initialize with the 22 EPAs when component mounts if EPAs are empty
  useEffect(() => {
    if (epas.length === 0) {
      const standardEPAs: EPA[] = [
        {
          id: '1',
          code: 'EPA 1',
          title: 'Initiate treatment for a patient requiring emergent/immediate intervention',
          description: 'Rapidly assess and begin treatment for patients requiring immediate life-saving interventions',
          category: 'Emergency Care',
          isActive: true
        },
        {
          id: '2',
          code: 'EPA 2',
          title: 'Lead the resuscitation of a critically ill or injured patient',
          description: 'Take charge of resuscitation efforts, coordinate team members, and manage complex emergency situations',
          category: 'Emergency Care',
          isActive: true
        },
        {
          id: '3',
          code: 'EPA 3',
          title: 'Obtain and interpret a focused history using data from all necessary sources',
          description: 'Gather comprehensive patient history from patient, family, records, and other healthcare providers',
          category: 'Patient Assessment',
          isActive: true
        },
        {
          id: '4',
          code: 'EPA 4',
          title: 'Perform and interpret a focused physical examination',
          description: 'Conduct targeted physical examinations based on patient presentation and clinical context',
          category: 'Patient Assessment',
          isActive: true
        },
        {
          id: '5',
          code: 'EPA 5',
          title: 'Create and prioritize a differential diagnosis',
          description: 'Develop comprehensive differential diagnoses and prioritize based on likelihood and urgency',
          category: 'Clinical Reasoning',
          isActive: true
        },
        {
          id: '6',
          code: 'EPA 6',
          title: 'Order and interpret diagnostic tests',
          description: 'Select appropriate diagnostic studies and accurately interpret results in clinical context',
          category: 'Clinical Reasoning',
          isActive: true
        },
        {
          id: '7',
          code: 'EPA 7',
          title: 'Apply best available evidence to guide patient care',
          description: 'Incorporate evidence-based medicine principles into clinical decision-making',
          category: 'Clinical Reasoning',
          isActive: true
        },
        {
          id: '8',
          code: 'EPA 8',
          title: 'Manage clinical or diagnostic uncertainty when caring for patients',
          description: 'Navigate ambiguous situations and make appropriate decisions with incomplete information',
          category: 'Clinical Reasoning',
          isActive: true
        },
        {
          id: '9',
          code: 'EPA 9',
          title: 'Utilize observation and reassessment to guide decision making',
          description: 'Continuously monitor patients and adjust treatment plans based on clinical evolution',
          category: 'Patient Management',
          isActive: true
        },
        {
          id: '10',
          code: 'EPA 10',
          title: 'Develop and implement an appropriate disposition and aftercare plan',
          description: 'Create safe discharge plans and coordinate appropriate follow-up care',
          category: 'Patient Management',
          isActive: true
        },
        {
          id: '11',
          code: 'EPA 11',
          title: 'Perform the diagnostic and therapeutic procedures of an emergency physician',
          description: 'Execute procedures safely and effectively in emergency settings',
          category: 'Procedures',
          isActive: true
        },
        {
          id: '12',
          code: 'EPA 12',
          title: 'Provide invasive and noninvasive airway management',
          description: 'Manage complex airway situations using various techniques and devices',
          category: 'Procedures',
          isActive: true
        },
        {
          id: '13',
          code: 'EPA 13',
          title: 'Perform and interpret point‐of‐care ultrasound',
          description: 'Use ultrasound for diagnostic and therapeutic purposes in emergency care',
          category: 'Procedures',
          isActive: true
        },
        {
          id: '14',
          code: 'EPA 14',
          title: 'Perform procedural sedation',
          description: 'Safely administer and monitor procedural sedation for various interventions',
          category: 'Procedures',
          isActive: true
        },
        {
          id: '15',
          code: 'EPA 15',
          title: 'Implement pharmacologic and therapeutic management plans',
          description: 'Select and administer appropriate medications and therapeutic interventions',
          category: 'Patient Management',
          isActive: true
        },
        {
          id: '16',
          code: 'EPA 16',
          title: 'Provide palliative and end‐of‐life care for patients and their families',
          description: 'Deliver compassionate end-of-life care and support families during difficult times',
          category: 'Patient Care',
          isActive: true
        },
        {
          id: '17',
          code: 'EPA 17',
          title: 'Document the EE encounter',
          description: 'Create comprehensive and accurate medical documentation for emergency encounters',
          category: 'Documentation',
          isActive: true
        },
        {
          id: '18',
          code: 'EPA 18',
          title: 'Communicate with other health care professionals about patient care',
          description: 'Effectively communicate patient information to healthcare team members',
          category: 'Communication',
          isActive: true
        },
        {
          id: '19',
          code: 'EPA 19',
          title: 'Communicate with the patient, family, and caregivers',
          description: 'Build rapport and effectively communicate with patients and families',
          category: 'Communication',
          isActive: true
        },
        {
          id: '20',
          code: 'EPA 20',
          title: 'Provide supervision or consultation for other health care professionals',
          description: 'Guide and support other healthcare providers in patient care decisions',
          category: 'Leadership',
          isActive: true
        },
        {
          id: '21',
          code: 'EPA 21',
          title: 'Manage the ED flow to optimize patient care',
          description: 'Coordinate patient flow and resource utilization to maximize efficiency',
          category: 'Systems-Based Practice',
          isActive: true
        },
        {
          id: '22',
          code: 'EPA 22',
          title: 'Fulfill professional obligations and adhere to professional standards',
          description: 'Demonstrate professionalism and commitment to ethical medical practice',
          category: 'Professionalism',
          isActive: true
        }
      ]
      setEPAs(standardEPAs)
      toast.success('EPA Bank initialized with 22 standard EPAs')
    }
  }, [epas, setEPAs])

  const categories = [
    'Emergency Care',
    'Patient Assessment', 
    'Clinical Reasoning',
    'Patient Management',
    'Procedures',
    'Patient Care',
    'Documentation',
    'Communication',
    'Leadership',
    'Systems-Based Practice',
    'Professionalism'
  ]

  const resetForm = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      category: '',
      isActive: true
    })
    setEditingEPA(null)
  }

  const handleEdit = (epa: EPA) => {
    setEditingEPA(epa)
    setFormData({
      code: epa.code,
      title: epa.title,
      description: epa.description,
      category: epa.category,
      isActive: epa.isActive
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!formData.code.trim() || !formData.title.trim() || !formData.description.trim() || !formData.category) {
      toast.error('Please fill in all required fields')
      return
    }

    if (editingEPA) {
      // Update existing EPA
      setEPAs(currentEPAs => 
        currentEPAs.map(epa => 
          epa.id === editingEPA.id 
            ? { ...epa, ...formData }
            : epa
        )
      )
      toast.success('EPA updated successfully')
    } else {
      // Create new EPA
      const newEPA: EPA = {
        id: Date.now().toString(),
        ...formData
      }
      setEPAs(currentEPAs => [...currentEPAs, newEPA])
      toast.success('EPA created successfully')
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this EPA?')) {
      setEPAs(currentEPAs => currentEPAs.filter(epa => epa.id !== id))
      toast.success('EPA deleted successfully')
    }
  }

  const toggleActiveStatus = (id: string) => {
    setEPAs(currentEPAs => 
      currentEPAs.map(epa => 
        epa.id === id 
          ? { ...epa, isActive: !epa.isActive }
          : epa
      )
    )
    toast.success('EPA status updated')
  }

  const activeEPAs = epas.filter(epa => epa.isActive)
  const inactiveEPAs = epas.filter(epa => !epa.isActive)
  
  // Group EPAs by category
  const epasByCategory = epas.reduce((acc, epa) => {
    if (!acc[epa.category]) {
      acc[epa.category] = []
    }
    acc[epa.category].push(epa)
    return acc
  }, {} as Record<string, EPA[]>)

  // Toggle category open/closed state
  const toggleCategoryOpen = (category: string) => {
    setCategoriesOpen(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const handleAddCategory = () => {
    // For now, this is a placeholder for category management functionality
    toast.info('Category management functionality coming soon')
  }

  const handleDeleteCategory = (categoryToDelete: string) => {
    if (confirm(`Are you sure you want to delete the category "${categoryToDelete}"? This action cannot be undone.`)) {
      // Remove all EPAs in this category
      setEPAs(currentEPAs => currentEPAs.filter(epa => epa.category !== categoryToDelete))
      toast.success(`Category "${categoryToDelete}" deleted successfully`)
    }
  }

  // Check if a category has any active EPAs
  const hasActiveEPAs = (categoryEPAs: EPA[]) => {
    return categoryEPAs.some(epa => epa.isActive)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">EPA Bank Management</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage the library of Entrustable Professional Activities (EPAs) used in assessments
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="shrink-0">
              <Plus size={16} />
              <span className="ml-2">Add EPA</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEPA ? 'Edit EPA' : 'Create New EPA'}</DialogTitle>
              <DialogDescription>
                {editingEPA ? 'Update the EPA details below.' : 'Add a new EPA to the assessment bank.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="epa-code">EPA Code *</Label>
                  <Input
                    id="epa-code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="EPA 23"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="epa-category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, category: value }))
                  }>
                    <SelectTrigger id="epa-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="epa-title">Title *</Label>
                <Input
                  id="epa-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief title describing the EPA"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="epa-description">Description *</Label>
                <Textarea
                  id="epa-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of what this EPA involves"
                  className="min-h-20"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="epa-active">Active Status</Label>
                <Switch
                  id="epa-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X size={16} />
                  <span className="ml-2">Cancel</span>
                </Button>
                <Button onClick={handleSubmit}>
                  <Save size={16} />
                  <span className="ml-2">{editingEPA ? 'Update' : 'Create'} EPA</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{epas.length}</div>
            <p className="text-sm text-muted-foreground">Total EPAs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{activeEPAs.length}</div>
            <p className="text-sm text-muted-foreground">Active EPAs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-500">{inactiveEPAs.length}</div>
            <p className="text-sm text-muted-foreground">Inactive EPAs</p>
          </CardContent>
        </Card>
      </div>

      {/* Active EPAs */}
      <Collapsible open={activeEPAsOpen} onOpenChange={setActiveEPAsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-lg flex items-center gap-2">
                <CaretDown 
                  size={16} 
                  className={`transition-transform duration-200 ${activeEPAsOpen ? 'rotate-0' : '-rotate-90'}`} 
                />
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Active EPAs ({activeEPAs.length})
              </CardTitle>
              <CardDescription>EPAs currently available for use in assessments</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-3">
                {activeEPAs.map(epa => (
                  <div key={epa.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{epa.code}</span>
                        <Badge variant="outline" className="text-xs">{epa.category}</Badge>
                      </div>
                      <h3 className="font-medium text-sm mb-1">{epa.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{epa.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActiveStatus(epa.id)}
                        className="text-xs"
                      >
                        Deactivate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(epa)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(epa.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Inactive EPAs */}
      {inactiveEPAs.length > 0 && (
        <Collapsible open={inactiveEPAsOpen} onOpenChange={setInactiveEPAsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CaretDown 
                    size={16} 
                    className={`transition-transform duration-200 ${inactiveEPAsOpen ? 'rotate-0' : '-rotate-90'}`} 
                  />
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  Inactive EPAs ({inactiveEPAs.length})
                </CardTitle>
                <CardDescription>EPAs not currently available in assessments</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-3">
                  {inactiveEPAs.map(epa => (
                    <div key={epa.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0 opacity-75">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{epa.code}</span>
                          <Badge variant="outline" className="text-xs">{epa.category}</Badge>
                        </div>
                        <h3 className="font-medium text-sm mb-1">{epa.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{epa.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActiveStatus(epa.id)}
                          className="text-xs"
                        >
                          Activate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(epa)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(epa.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Categories */}
      <Collapsible open={categoriesSectionOpen} onOpenChange={setCategoriesSectionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-lg flex items-center gap-2">
                <CaretDown 
                  size={16} 
                  className={`transition-transform duration-200 ${categoriesSectionOpen ? 'rotate-0' : '-rotate-90'}`} 
                />
                <div className="w-3 h-3 bg-accent rounded-full"></div>
                Categories ({Object.keys(epasByCategory).length})
              </CardTitle>
              <CardDescription>View EPAs organized by category</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="mb-4">
                <Button onClick={handleAddCategory} className="shrink-0">
                  <Plus size={16} />
                  <span className="ml-2">Add Category</span>
                </Button>
              </div>
              
              <div className="space-y-4">
                {Object.entries(epasByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryEPAs]) => (
                  <Collapsible 
                    key={category} 
                    open={categoriesOpen[category] || false} 
                    onOpenChange={() => toggleCategoryOpen(category)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <CardTitle className="text-base flex items-center gap-2">
                            <CaretDown 
                              size={16} 
                              className={`transition-transform duration-200 ${categoriesOpen[category] ? 'rotate-0' : '-rotate-90'}`} 
                            />
                            <div className="w-3 h-3 bg-accent rounded-full"></div>
                            {category}
                            <Badge variant="secondary" className="ml-auto">
                              {categoryEPAs.length} EPA{categoryEPAs.length !== 1 ? 's' : ''}
                            </Badge>
                            {!hasActiveEPAs(categoryEPAs) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteCategory(category)
                                }}
                                className="text-destructive hover:text-destructive ml-2"
                                title="Delete category (no active EPAs)"
                              >
                                <Trash size={14} />
                              </Button>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {categoryEPAs.filter(epa => epa.isActive).length} active, {categoryEPAs.filter(epa => !epa.isActive).length} inactive
                          </CardDescription>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="space-y-3">
                            {categoryEPAs.sort((a, b) => a.code.localeCompare(b.code)).map(epa => (
                              <div 
                                key={epa.id} 
                                className={`flex items-start justify-between gap-3 p-3 border rounded-lg ${
                                  !epa.isActive ? 'bg-muted/50 opacity-75' : ''
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{epa.code}</span>
                                    <div className={`w-2 h-2 rounded-full ${epa.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    <span className="text-xs text-muted-foreground">
                                      {epa.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <h3 className="font-medium text-sm mb-1">{epa.title}</h3>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{epa.description}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleActiveStatus(epa.id)}
                                    className="text-xs"
                                  >
                                    {epa.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(epa)}
                                  >
                                    <Pencil size={14} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(epa.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash size={14} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}