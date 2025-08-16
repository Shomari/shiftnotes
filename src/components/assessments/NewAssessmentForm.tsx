import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Assessment, EPA, AssessmentEPA, ENTRUSTMENT_LEVELS, User } from '../../lib/types'
import { toISOString } from '@/lib/utils'
import { Plus, Trash2, Save, Send } from '@phosphor-icons/react'

export function NewAssessmentForm() {
  const { user } = useAuth()
  const [assessments, setAssessments] = useKV<Assessment[]>('assessments', [])
  const [epas, setEPAs] = useKV<EPA[]>('epas', [])
  const [users] = useKV<User[]>('users', [])
  
  const [formData, setFormData] = useState({
    traineeId: '',
    shiftDate: new Date().toISOString().split('T')[0],
    location: '',
    privateComments: ''
  })
  const [selectedEPAs, setSelectedEPAs] = useState<string[]>([])
  const [epaAssessments, setEpaAssessments] = useState<Record<string, Partial<AssessmentEPA>>>({})
  const [isLoading, setIsLoading] = useState(false)

  // EPAs will be initialized by the EPA Bank Management component
  // No need to initialize demo EPAs here anymore

  const trainees = users.filter(u => u.role === 'trainee')

  const handleEPAToggle = (epaId: string) => {
    setSelectedEPAs(current => {
      if (current.includes(epaId)) {
        const updated = current.filter(id => id !== epaId)
        const newAssessments = { ...epaAssessments }
        delete newAssessments[epaId]
        setEpaAssessments(newAssessments)
        return updated
      } else {
        return [...current, epaId]
      }
    })
  }

  const updateEPAAssessment = (epaId: string, field: string, value: any) => {
    setEpaAssessments(current => ({
      ...current,
      [epaId]: {
        ...current[epaId],
        [field]: value
      }
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.traineeId) {
      toast.error('Please select a trainee')
      return false
    }
    if (selectedEPAs.length === 0) {
      toast.error('Please select at least one EPA')
      return false
    }
    
    for (const epaId of selectedEPAs) {
      const assessment = epaAssessments[epaId]
      if (!assessment?.entrustmentLevel) {
        const epa = epas.find(e => e.id === epaId)
        toast.error(`Please set entrustment level for ${epa?.code}`)
        return false
      }
      if (!assessment?.whatWentWell?.trim()) {
        const epa = epas.find(e => e.id === epaId)
        toast.error(`Please add "What went well" comment for ${epa?.code}`)
        return false
      }
      if (!assessment?.whatCouldImprove?.trim()) {
        const epa = epas.find(e => e.id === epaId)
        toast.error(`Please add "What could be improved" comment for ${epa?.code}`)
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validateForm()) return
    if (!user) return

    setIsLoading(true)

    try {
      const trainee = trainees.find(t => t.id === formData.traineeId)
      
      const assessmentEPAs: AssessmentEPA[] = selectedEPAs.map(epaId => {
        const epa = epas.find(e => e.id === epaId)!
        const assessment = epaAssessments[epaId]
        return {
          epaId,
          epaCode: epa.code,
          epaTitle: epa.title,
          entrustmentLevel: assessment?.entrustmentLevel || 1,
          whatWentWell: assessment?.whatWentWell || '',
          whatCouldImprove: assessment?.whatCouldImprove || ''
        }
      })

      const newAssessment: Assessment = {
        id: Date.now().toString(),
        traineeId: formData.traineeId,
        evaluatorId: user.id,
        shiftDate: formData.shiftDate,
        location: formData.location,
        epas: assessmentEPAs,
        status: isDraft ? 'draft' : 'submitted',
        createdAt: toISOString(new Date()),
        updatedAt: toISOString(new Date()),
        traineeName: trainee?.name || 'Unknown',
        evaluatorName: user.name,
        privateComments: formData.privateComments
      }

      setAssessments(current => [...current, newAssessment])
      
      toast.success(isDraft ? 'Assessment saved as draft' : 'Assessment submitted successfully')
      
      // Reset form
      setFormData({
        traineeId: '',
        shiftDate: new Date().toISOString().split('T')[0],
        location: '',
        privateComments: ''
      })
      setSelectedEPAs([])
      setEpaAssessments({})
      
    } catch (error) {
      toast.error('Failed to save assessment')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">New Assessment</h2>
        <p className="text-muted-foreground text-sm sm:text-base">Complete a post-shift EPA assessment for a trainee</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Assessment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trainee">Trainee *</Label>
                  <Select value={formData.traineeId} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, traineeId: value }))
                  }>
                    <SelectTrigger id="trainee">
                      <SelectValue placeholder="Select trainee" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainees.map(trainee => (
                        <SelectItem key={trainee.id} value={trainee.id}>
                          {trainee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shiftDate">Shift Date *</Label>
                  <Input
                    id="shiftDate"
                    type="date"
                    value={formData.shiftDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, shiftDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location/Site</Label>
                <Select value={formData.location} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, location: value }))
                }>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select location/site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Emergency Department">Emergency Department</SelectItem>
                    <SelectItem value="ICU">Intensive Care Unit</SelectItem>
                    <SelectItem value="Ward 3A">Ward 3A</SelectItem>
                    <SelectItem value="Ward 3B">Ward 3B</SelectItem>
                    <SelectItem value="Ward 4A">Ward 4A</SelectItem>
                    <SelectItem value="Ward 4B">Ward 4B</SelectItem>
                    <SelectItem value="Operating Room">Operating Room</SelectItem>
                    <SelectItem value="Cardiac Cath Lab">Cardiac Cath Lab</SelectItem>
                    <SelectItem value="Outpatient Clinic">Outpatient Clinic</SelectItem>
                    <SelectItem value="Trauma Bay">Trauma Bay</SelectItem>
                    <SelectItem value="Radiology">Radiology</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* EPA Selection */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">EPA Selection</CardTitle>
              <CardDescription className="text-sm">Select the EPAs observed during this shift</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="epa-select">Select EPA</Label>
                <Select onValueChange={(value) => {
                  if (value && value !== "" && !selectedEPAs.includes(value)) {
                    handleEPAToggle(value)
                  }
                }}>
                  <SelectTrigger id="epa-select" className="w-full min-w-0">
                    <SelectValue placeholder="Choose an EPA to assess" />
                  </SelectTrigger>
                  <SelectContent>
                    {epas.filter(epa => epa.isActive && epa.id).map(epa => (
                      <SelectItem 
                        key={epa.id} 
                        value={epa.id}
                        disabled={selectedEPAs.includes(epa.id)}
                        className="max-w-full"
                      >
                        <div className="flex flex-col min-w-0 w-full">
                          <span className="font-medium text-sm leading-tight break-words">{epa.code}: {epa.title}</span>
                          <span className="text-xs text-muted-foreground">{epa.category}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEPAs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected EPAs:</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedEPAs.map(epaId => {
                      const epa = epas.find(e => e.id === epaId)
                      if (!epa) return null
                      return (
                        <Badge key={epaId} variant="secondary" className="text-xs">
                          {epa.code}
                          <button
                            type="button"
                            onClick={() => handleEPAToggle(epaId)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* EPA Assessments */}
          {selectedEPAs.length > 0 && (
            <div className="space-y-4">
              {selectedEPAs.map(epaId => {
                const epa = epas.find(e => e.id === epaId)!
                const assessment = epaAssessments[epaId] || {}
                
                return (
                  <Card key={epaId}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base sm:text-lg">{epa.code}: {epa.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm sm:text-base font-medium">Entrustment Level *</Label>
                        <div className="mt-3 space-y-3">
                          {[1, 2, 3, 4, 5].map(level => (
                            <div key={level} className="flex items-start space-x-3 p-2 -m-2 rounded-md hover:bg-muted/50">
                              <input
                                type="radio"
                                id={`${epaId}-level-${level}`}
                                name={`${epaId}-level`}
                                value={level}
                                checked={assessment.entrustmentLevel === level}
                                onChange={() => updateEPAAssessment(epaId, 'entrustmentLevel', level)}
                                className="mt-1"
                              />
                              <Label htmlFor={`${epaId}-level-${level}`} className="text-xs sm:text-sm cursor-pointer leading-relaxed">
                                <span className="font-medium">Level {level}:</span>{' '}
                                {ENTRUSTMENT_LEVELS[level as keyof typeof ENTRUSTMENT_LEVELS]}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${epaId}-well`} className="text-sm sm:text-base">What went well? *</Label>
                        <Textarea
                          id={`${epaId}-well`}
                          value={assessment.whatWentWell || ''}
                          onChange={(e) => updateEPAAssessment(epaId, 'whatWentWell', e.target.value)}
                          placeholder="Describe what the trainee did well during this EPA..."
                          className="min-h-20 text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${epaId}-improve`} className="text-sm sm:text-base">What could be improved? *</Label>
                        <Textarea
                          id={`${epaId}-improve`}
                          value={assessment.whatCouldImprove || ''}
                          onChange={(e) => updateEPAAssessment(epaId, 'whatCouldImprove', e.target.value)}
                          placeholder="Describe areas where the trainee can improve..."
                          className="min-h-20 text-sm sm:text-base"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Private Comments */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Private Comments for Leadership</CardTitle>
              <CardDescription className="text-sm">Optional comments visible only to leadership (not the trainee)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.privateComments}
                onChange={(e) => setFormData(prev => ({ ...prev, privateComments: e.target.value }))}
                placeholder="Any concerns or additional context for leadership review..."
                className="min-h-24 text-sm sm:text-base"
              />
            </CardContent>
          </Card>

          {/* Mobile Action Buttons */}
          <div className="lg:hidden space-y-3 pt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trainee:</span>
                      <span className="text-right">{formData.traineeId ? trainees.find(t => t.id === formData.traineeId)?.name : 'Not selected'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>{formData.shiftDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">EPAs:</span>
                      <span>{selectedEPAs.length}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => handleSubmit(true)} 
                      variant="outline" 
                      disabled={isLoading || selectedEPAs.length === 0}
                      size="sm"
                    >
                      <Save size={16} />
                      <span className="ml-2">Save Draft</span>
                    </Button>
                    
                    <Button 
                      onClick={() => handleSubmit(false)}
                      disabled={isLoading || selectedEPAs.length === 0}
                      size="sm"
                    >
                      <Send size={16} />
                      <span className="ml-2">Submit</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Desktop Summary Sidebar */}
        <div className="hidden lg:block space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trainee:</span>
                  <span>{formData.traineeId ? trainees.find(t => t.id === formData.traineeId)?.name : 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{formData.shiftDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EPAs:</span>
                  <span>{selectedEPAs.length}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Button 
                  onClick={() => handleSubmit(true)} 
                  variant="outline" 
                  className="w-full"
                  disabled={isLoading || selectedEPAs.length === 0}
                >
                  <Save size={16} />
                  <span className="ml-2">Save Draft</span>
                </Button>
                
                <Button 
                  onClick={() => handleSubmit(false)} 
                  className="w-full"
                  disabled={isLoading || selectedEPAs.length === 0}
                >
                  <Send size={16} />
                  <span className="ml-2">Submit Assessment</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}