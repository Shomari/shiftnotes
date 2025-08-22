import { useState, useEffect, useMemo } from 'react'
import { useKV } from '../../hooks/useKV'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { EPA } from '@/lib/types'
import { COMPETENCIES, getSubCompetencyById } from '@/data/milestones'
import { 
  Plus, 
  CaretDown, 
  CaretUp, 
  Pencil, 
  Trash, 
  Target,
  Link,
  Gear
} from '@phosphor-icons/react'

/** =========================
 * Types
 * ========================= */

interface Milestone {
  id: string
  title: string
  description: string
  category: string             // competency id
  subCompetency?: string       // sub-competency id (optional)
  targetLevel: number
}

interface SubCompetency {
  id: string
  code: string
  name: string
}

interface MilestoneCategory {
  id: string
  name: string
  description: string
  color: string
  subCompetencies: SubCompetency[]
}

/** Map sub-competency -> EPA IDs */
type SubCompEPAMap = Record<string, string[]>

/** =========================
 * Constants (authoritative lists)
 * ========================= */
const DEFAULT_CATEGORIES: MilestoneCategory[] = COMPETENCIES.map(comp => ({
  id: comp.id.toLowerCase().replace(/\s+/g, '-'),
  name: comp.name,
  description: `Core competency: ${comp.name}`,
  color: comp.id === 'PC' ? 'green' : 
        comp.id === 'MK' ? 'blue' :
        comp.id === 'SBP' ? 'purple' :
        comp.id === 'PBLI' ? 'indigo' :
        comp.id === 'PROF' ? 'orange' :
        comp.id === 'ICS' ? 'pink' : 'gray',
  subCompetencies: comp.subCompetencies.map(subComp => ({
    id: subComp.id.toLowerCase(),
    code: subComp.id,
    name: subComp.name
  }))
}))

/** =========================
 * Milestone Card (no EPA mapping here)
 * ========================= */
interface MilestoneCardProps {
  milestone: Milestone
  onEdit: (milestone: Milestone) => void
  onDelete: (milestoneId: string) => void
}

function MilestoneCard({ milestone, onEdit, onDelete }: MilestoneCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold">{milestone.title}</h4>
            <Badge variant="outline">
              <Target className="w-3 h-3 mr-1" />
              Level {milestone.targetLevel}
            </Badge>
          </div>
          {milestone.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {milestone.description}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(milestone)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(milestone.id)}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/** =========================
 * Main Component
 * ========================= */
export function MilestoneMapping() {
  // Data stores
  const [milestones, setMilestones] = useKV<Milestone[]>("milestones", [])
  const [milestoneCategories, setMilestoneCategories] = useKV<MilestoneCategory[]>("milestone-categories", DEFAULT_CATEGORIES)
  const [epas] = useKV<EPA[]>("epas", [])
  const [subCompEPAMap, setSubCompEPAMap] = useKV<SubCompEPAMap>('subcomp-epa-map', {})

  // UI state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["pc"]))
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [isCreateCompetencyDialogOpen, setIsCreateCompetencyDialogOpen] = useState(false)
  const [isCreateSubCompetencyDialogOpen, setIsCreateSubCompetencyDialogOpen] = useState(false)
  const [selectedCompetencyForSubComp, setSelectedCompetencyForSubComp] = useState<string>('')
  const [isManageEPAsDialogOpen, setIsManageEPAsDialogOpen] = useState(false)
  const [selectedSubCompForEPAs, setSelectedSubCompForEPAs] = useState<string>('')

  // Form state for new competency
  const [newCompetency, setNewCompetency] = useState({
    title: '',
    description: ''
  })

  // Form state for new sub-competency
  const [newSubCompetency, setNewSubCompetency] = useState({
    code: '',
    name: ''
  })

  /** =========================
   * One-time KV migration / hardening
   * - Ensures categories exist and each has subCompetencies
   * ========================= */
  useEffect(() => {
    const current = Array.isArray(milestoneCategories) ? milestoneCategories : []
    // If nothing stored, seed with defaults
    if (!Array.isArray(milestoneCategories) || milestoneCategories.length === 0) {
      setMilestoneCategories(DEFAULT_CATEGORIES)
      return
    }
    // Ensure every category matches our authoritative list for sub-competencies
    const byIdDefault = Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, c]))
    let changed = false
    const fixed = current.map(c => {
      const def = byIdDefault[c.id]
      // If category unknown, keep as-is but ensure subCompetencies is at least []
      if (!def) {
        if (!Array.isArray(c.subCompetencies)) {
          changed = true
          return { ...c, subCompetencies: [] }
        }
        return c
      }
      // Merge: keep name/description/color from existing, but ensure full default subCompetencies
      const have = Array.isArray(c.subCompetencies) ? c.subCompetencies : []
      // If missing or different count, replace with defaults (simplest & safest)
      if (have.length !== def.subCompetencies.length) {
        changed = true
        return { ...c, subCompetencies: def.subCompetencies }
      }
      // Also check ids match (guard against partials)
      const sameIds = have.every((sc, i) => sc.id === def.subCompetencies[i].id)
      if (!sameIds) {
        changed = true
        return { ...c, subCompetencies: def.subCompetencies }
      }
      return c
    })
    if (changed) setMilestoneCategories(fixed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(milestoneCategories)])

  /** =========================
   * Safe selectors / helpers
   * ========================= */
  const categoriesSafe: MilestoneCategory[] = useMemo(
    () => (Array.isArray(milestoneCategories) ? milestoneCategories : []),
    [milestoneCategories]
  )

  const epasSafe: EPA[] = useMemo(
    () => (Array.isArray(epas) ? epas : []),
    [epas]
  )

  const activeEPAs = useMemo(
    () => epasSafe.filter(epa => !!epa && epa.isActive),
    [epasSafe]
  )

  const milestonesSafe: Milestone[] = useMemo(
    () => (Array.isArray(milestones) ? milestones : []),
    [milestones]
  )

  const toggleCategory = (categoryId: string) => {
    const next = new Set(expandedCategories)
    next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId)
    setExpandedCategories(next)
  }

  const getCategoryColorClass = (categoryId: string) => {
    const category = categoriesSafe.find(c => c.id === categoryId)
    const colorMap: Record<string, string> = {
      'blue': 'bg-blue-500',
      'green': 'bg-green-500',
      'purple': 'bg-purple-500',
      'orange': 'bg-orange-500',
      'pink': 'bg-pink-500',
      'indigo': 'bg-indigo-500',
      'gray': 'bg-gray-500'
    }
    return colorMap[category?.color || 'gray'] || 'bg-gray-500'
  }

  const getMilestonesBySubCompetency = (categoryId: string, subCompetencyId: string) => {
    return milestonesSafe.filter(m => m.category === categoryId && m.subCompetency === subCompetencyId)
  }

  const getEditingCategorySubCompetencies = () => {
    if (!editingMilestone?.category) return []
    const category = categoriesSafe.find(c => c.id === editingMilestone.category)
    return Array.isArray(category?.subCompetencies) ? category!.subCompetencies : []
  }

  const getMappedEPAsForSubComp = (subCompId: string) => (subCompEPAMap?.[subCompId] ?? [])

  const toggleEPAMappingForSubComp = (subCompId: string, epaId: string) => {
    setSubCompEPAMap(prev => {
      const safePrev = prev && typeof prev === 'object' ? prev : {}
      const current = Array.isArray(safePrev[subCompId]) ? safePrev[subCompId] : []
      const next = current.includes(epaId)
        ? current.filter(id => id !== epaId)
        : [...current, epaId]
      return { ...safePrev, [subCompId]: next }
    })
  }

  /** =========================
   * CRUD Competencies
   * ========================= */
  const handleCreateCompetency = () => {
    if (!newCompetency.title.trim()) {
      toast.error("Please enter a title for the competency")
      return
    }

    const competency: MilestoneCategory = {
      id: Date.now().toString(),
      name: newCompetency.title.trim(),
      description: newCompetency.description.trim(),
      color: 'gray',
      subCompetencies: []
    }

    setMilestoneCategories(current => ([...(Array.isArray(current) ? current : []), competency]))
    setNewCompetency({
      title: '',
      description: ''
    })
    setIsCreateCompetencyDialogOpen(false)
    toast.success("Competency created successfully")
  }

  const handleCreateSubCompetency = () => {
    if (!newSubCompetency.code.trim() || !newSubCompetency.name.trim()) {
      toast.error("Please enter both code and name for the sub-competency")
      return
    }

    if (!selectedCompetencyForSubComp) {
      toast.error("No competency selected")
      return
    }

    const subCompetency: SubCompetency = {
      id: Date.now().toString(),
      code: newSubCompetency.code.trim(),
      name: newSubCompetency.name.trim()
    }

    setMilestoneCategories(current => {
      const categories = Array.isArray(current) ? current : []
      return categories.map(category => {
        if (category.id === selectedCompetencyForSubComp) {
          return {
            ...category,
            subCompetencies: [...(category.subCompetencies || []), subCompetency]
          }
        }
        return category
      })
    })

    setNewSubCompetency({
      code: '',
      name: ''
    })
    setIsCreateSubCompetencyDialogOpen(false)
    setSelectedCompetencyForSubComp('')
    toast.success("Sub-competency created successfully")
  }

  /** =========================
   * CRUD Milestones
   * ========================= */
  const handleEditMilestone = () => {
    if (!editingMilestone || !editingMilestone.title || !editingMilestone.category || !editingMilestone.subCompetency) {
      toast.error("Please fill in all required fields")
      return
    }
    setMilestones(current => {
      const list = Array.isArray(current) ? current : []
      return list.map(m => m.id === editingMilestone.id ? editingMilestone : m)
    })
    setEditingMilestone(null)
    setIsEditDialogOpen(false)
    toast.success("Milestone updated successfully")
  }

  const handleDeleteMilestone = (milestoneId: string) => {
    setMilestones(current => {
      const list = Array.isArray(current) ? current : []
      return list.filter(m => m.id !== milestoneId)
    })
    toast.success("Milestone deleted successfully")
  }

  /** =========================
   * Render
   * ========================= */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Milestone Mapping</h2>
          <p className="text-muted-foreground">
            Configure EPA mappings at the sub-competency level. All milestones must be assigned to a sub-competency.
          </p>
        </div>

        {/* Create Competency Dialog */}
        <Dialog open={isCreateCompetencyDialogOpen} onOpenChange={setIsCreateCompetencyDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Competency
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Competency</DialogTitle>
              <DialogDescription>
                Add a new competency category to organize milestones.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="competency-title">Title *</Label>
                <Input
                  id="competency-title"
                  value={newCompetency.title}
                  onChange={(e) => setNewCompetency(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter competency title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="competency-description">Description</Label>
                <Textarea
                  id="competency-description"
                  value={newCompetency.description}
                  onChange={(e) => setNewCompetency(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter competency description (optional)"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateCompetencyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateCompetency}>
                  Create Competency
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>



      {/* Competency blocks */}
      <div className="space-y-4">
        {(categoriesSafe ?? []).map(category => {
          const isExpanded = expandedCategories.has(category.id)
          const categoryMilestones = milestonesSafe.filter(m => m.category === category.id)

          return (
            <Card key={category.id}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer hover:bg-muted/50 transition-colors p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColorClass(category.id)}`} />
                      <div>
                        <h3 className="text-lg font-semibold leading-none">{category.name}</h3>
                        <p className="text-muted-foreground text-sm mt-1.5">{category.description}</p>
                      </div>
                    </div>
                    {isExpanded ? <CaretUp className="w-5 h-5" /> : <CaretDown className="w-5 h-5" />}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-8">
                      {/* Sub-competency sections (ALWAYS render) */}
                      {(category.subCompetencies ?? []).map(subComp => {
                        const subCompMilestones = getMilestonesBySubCompetency(category.id, subComp.id)
                        const mappedEPAIds = getMappedEPAsForSubComp(subComp.id)

                        return (
                          <div key={subComp.id} className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-medium">
                                  {subComp.code}
                                </Badge>
                                <h5 className="font-medium text-sm">{subComp.name}</h5>
                                <Badge variant="default" className="text-xs">
                                  <Link className="w-3 h-3 mr-1" />
                                  {mappedEPAIds.length} EPA{mappedEPAIds.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSubCompForEPAs(subComp.id)
                                  setIsManageEPAsDialogOpen(true)
                                }}
                              >
                                <Gear className="w-4 h-4 mr-2" />
                                Manage EPAs
                              </Button>
                            </div>

                            {/* EPA mapping panel */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {mappedEPAIds.length === 0 ? (
                                <div className="text-sm text-muted-foreground col-span-2 text-center py-4">
                                  No EPAs mapped to this sub-competency yet.
                                </div>
                              ) : (
                                activeEPAs
                                  .filter(epa => mappedEPAIds.includes(epa.id))
                                  .map(epa => (
                                    <div
                                      key={epa.id}
                                      className="p-3 rounded-lg border bg-primary/10 border-primary"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <p className="font-medium text-sm">{epa.title}</p>
                                          {epa.description && (
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                              {epa.description}
                                            </p>
                                          )}
                                        </div>
                                        <Badge variant="default" className="ml-2">
                                          Mapped
                                        </Badge>
                                      </div>
                                    </div>
                                  ))
                              )}
                            </div>

                            {/* Milestone Levels */}
                            {(() => {
                              const milestoneData = getSubCompetencyById(subComp.code)
                              if (!milestoneData) return null
                              
                              return (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2">
                                    <h6 className="font-medium text-sm">Milestone Levels</h6>
                                    <Badge variant="secondary" className="text-xs">
                                      {milestoneData.levels.length} levels
                                    </Badge>
                                  </div>
                                  <div className="space-y-3">
                                    {milestoneData.levels.map((level, levelIndex) => (
                                      <div key={levelIndex} className="border rounded-lg p-4 bg-muted/30">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge variant="outline" className="font-medium">
                                            Level {level.level}
                                          </Badge>
                                        </div>
                                        <div className="space-y-2">
                                          {level.descriptions.map((description, descIndex) => (
                                            <div key={descIndex} className="flex items-start gap-2">
                                              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                                              <p className="text-sm text-foreground leading-relaxed">
                                                {description}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })()}

                            {/* Milestones under this sub-competency */}
                            {subCompMilestones.length > 0 && (
                              subCompMilestones.map((milestone, index) => (
                                <div key={milestone.id}>
                                  {index > 0 && <Separator className="my-4" />}
                                  <MilestoneCard
                                    milestone={milestone}
                                    onEdit={(m) => { setEditingMilestone(m); setIsEditDialogOpen(true) }}
                                    onDelete={handleDeleteMilestone}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        )
                      })}

                      {/* Add Sub-Competency Button */}
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedCompetencyForSubComp(category.id)
                            setIsCreateSubCompetencyDialogOpen(true)
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Sub-Competency
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <DialogDescription>
              Update milestone details. Sub-competency assignment is required.
            </DialogDescription>
          </DialogHeader>
          {editingMilestone && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={editingMilestone.title}
                    onChange={(e) => setEditingMilestone(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="Enter milestone title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Competency *</Label>
                  <Select
                    value={editingMilestone.category}
                    onValueChange={(value) => setEditingMilestone(prev => prev ? { ...prev, category: value, subCompetency: '' } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(categoriesSafe ?? []).map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editingMilestone.category && (
                <div className="space-y-2">
                  <Label htmlFor="edit-sub-competency">Sub-Competency *</Label>
                  <Select
                    value={editingMilestone.subCompetency || ''}
                    onValueChange={(value) => setEditingMilestone(prev => prev ? { ...prev, subCompetency: value || undefined } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-competency" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEditingCategorySubCompetencies().map(subComp => (
                        <SelectItem key={subComp.id} value={subComp.id}>
                          {subComp.code}: {subComp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingMilestone.description}
                  onChange={(e) => setEditingMilestone(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Enter milestone description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-target-level">Target Entrustment Level</Label>
                <Select
                  value={editingMilestone.targetLevel.toString()}
                  onValueChange={(value) => setEditingMilestone(prev => prev ? { ...prev, targetLevel: parseInt(value) } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Level 1 - Requires direct supervision</SelectItem>
                    <SelectItem value="2">Level 2 - Requires considerable supervision</SelectItem>
                    <SelectItem value="3">Level 3 - Requires minimal supervision</SelectItem>
                    <SelectItem value="4">Level 4 - Requires indirect supervision</SelectItem>
                    <SelectItem value="5">Level 5 - Requires no supervision</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditMilestone}>
                  Update Milestone
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Sub-Competency Dialog */}
      <Dialog 
        open={isCreateSubCompetencyDialogOpen} 
        onOpenChange={(open) => {
          setIsCreateSubCompetencyDialogOpen(open)
          if (!open) {
            setSelectedCompetencyForSubComp('')
            setNewSubCompetency({ code: '', name: '' })
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Sub-Competency</DialogTitle>
            <DialogDescription>
              Add a new sub-competency to organize milestones and EPA mappings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subcomp-code">Code *</Label>
              <Input
                id="subcomp-code"
                value={newSubCompetency.code}
                onChange={(e) => setNewSubCompetency(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g., PC9, MK3, etc."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subcomp-name">Name *</Label>
              <Input
                id="subcomp-name"
                value={newSubCompetency.name}
                onChange={(e) => setNewSubCompetency(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter sub-competency name"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateSubCompetencyDialogOpen(false)
                  setSelectedCompetencyForSubComp('')
                  setNewSubCompetency({ code: '', name: '' })
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateSubCompetency}>
                Create Sub-Competency
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage EPAs Dialog */}
      <Dialog 
        open={isManageEPAsDialogOpen} 
        onOpenChange={(open) => {
          setIsManageEPAsDialogOpen(open)
          if (!open) {
            setSelectedSubCompForEPAs('')
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage EPA Mappings</DialogTitle>
            <DialogDescription>
              Select which EPAs should be mapped to this sub-competency. Click EPAs to toggle their mapping status.
            </DialogDescription>
          </DialogHeader>
          {selectedSubCompForEPAs && (() => {
            const subComp = categoriesSafe
              .flatMap(cat => cat.subCompetencies || [])
              .find(sc => sc.id === selectedSubCompForEPAs)
            const mappedEPAIds = getMappedEPAsForSubComp(selectedSubCompForEPAs)
            
            return (
              <div className="space-y-4">
                {subComp && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Badge variant="outline" className="font-medium">
                      {subComp.code}
                    </Badge>
                    <span className="font-medium">{subComp.name}</span>
                    <Badge variant="default" className="ml-auto">
                      <Link className="w-3 h-3 mr-1" />
                      {mappedEPAIds.length} EPA{mappedEPAIds.length !== 1 ? 's' : ''} mapped
                    </Badge>
                  </div>
                )}
                
                {activeEPAs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active EPAs available for mapping.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {activeEPAs.map(epa => {
                      const isMapped = mappedEPAIds.includes(epa.id)
                      return (
                        <div
                          key={epa.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                            isMapped 
                              ? 'bg-primary/10 border-primary ring-1 ring-primary/20' 
                              : 'bg-card border-border hover:bg-muted/50 hover:border-muted-foreground/30'
                          }`}
                          onClick={() => toggleEPAMappingForSubComp(selectedSubCompForEPAs, epa.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{epa.title}</p>
                              {epa.description && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                  {epa.description}
                                </p>
                              )}
                            </div>
                            {isMapped && (
                              <Badge variant="default" className="ml-3 flex-shrink-0">
                                Mapped
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsManageEPAsDialogOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
