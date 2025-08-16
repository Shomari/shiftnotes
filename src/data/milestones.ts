// Milestone data structure containing competencies, sub-competencies, and their detailed levels
export interface MilestoneLevel {
  level: number;
  descriptions: string[];
}

export interface SubCompetency {
  id: string;
  name: string;
  levels: MilestoneLevel[];
}

export interface Competency {
  id: string;
  name: string;
  subCompetencies: SubCompetency[];
}

export const COMPETENCIES: Competency[] = [
  {
    id: 'PC',
    name: 'Patient Care',
    subCompetencies: [
      {
        id: 'PC1',
        name: 'Emergency Stabilization',
        levels: [
          {
            level: 1,
            descriptions: ['Detects when a patient\'s vital signs are abnormal']
          },
          {
            level: 2,
            descriptions: [
              'Assesses a patient\'s ABCs and performs basic interventions',
              'Identifies a patient who is unstable and requires immediate intervention'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Addresses the unstable vital signs and initiates advanced resuscitation procedures and protocols',
              'Identifies a patient with occult presentation that is at risk for instability or deterioration',
              'Reassesses the patient\'s status after implementing a stabilizing intervention'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Ascertains, in a timely fashion, when further clinical intervention for a patient is futile',
              'Integrates hospital support services into the management of critically-ill or -injured patients'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Manages patients with rare or complex presentations requiring emergency stabilization'
            ]
          }
        ]
      },
      {
        id: 'PC2',
        name: 'Performance of a Focused History and Physical Exam',
        levels: [
          {
            level: 1,
            descriptions: ['Elicits and communicates a reliable comprehensive patient history and performs a physical exam']
          },
          {
            level: 2,
            descriptions: ['Elicits and communicates a focused patient history and performs a focused physical exam that effectively address the patient\'s chief complaint and urgent issues']
          },
          {
            level: 3,
            descriptions: ['Prioritizes essential components of a patient history and physical exam, given a limited or dynamic circumstance']
          },
          {
            level: 4,
            descriptions: ['Using all potential sources of data, gathers those that are necessary for the beneficial management of patients']
          },
          {
            level: 5,
            descriptions: ['Models the effective use of a patient history and physical exam to minimize the need for further diagnostic testing']
          }
        ]
      },
      {
        id: 'PC3',
        name: 'Diagnostic Studies',
        levels: [
          {
            level: 1,
            descriptions: [
              'Determines the need for diagnostic studies',
              'Demonstrates understanding of diagnostic testing principles'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Selects appropriate diagnostic studies and reviews the risks, benefits, and contraindications of them',
              'Interprets results of diagnostic testing (e.g., electrocardiogram (EKG), diagnostic radiology, point-of-care ultrasound)'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Given a limited or dynamic circumstance, prioritizes the diagnostic studies that are essential',
              'Orders and performs diagnostic testing, considering the pre-test probability of disease and the likelihood of test results altering management'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Practices cost-effective ordering of diagnostic studies',
              'Considers the factors that impact post-test probability'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Proposes alternatives when barriers exist to specific diagnostic studies',
              'In the context of the patient presentation, discriminates between subtle and/or conflicting diagnostic results'
            ]
          }
        ]
      },
      {
        id: 'PC4',
        name: 'Diagnosis',
        levels: [
          {
            level: 1,
            descriptions: ['Constructs a list of potential diagnoses based on the patient\'s chief complaint and initial assessment']
          },
          {
            level: 2,
            descriptions: ['Provides a prioritized differential diagnosis']
          },
          {
            level: 3,
            descriptions: ['Provides a diagnosis for common medical conditions and demonstrates the ability to modify a diagnosis based on a patient\'s clinical course and additional data']
          },
          {
            level: 4,
            descriptions: ['Provides a diagnosis for patients with multiple comorbidities or uncommon medical conditions, recognizing errors in clinical reasoning']
          },
          {
            level: 5,
            descriptions: ['Serves as a role model and educator to other learners for deriving diagnoses and recognizing errors in clinical reasoning']
          }
        ]
      },
      {
        id: 'PC5',
        name: 'Pharmacotherapy',
        levels: [
          {
            level: 1,
            descriptions: [
              'Describes the different classifications of pharmacologic agents',
              'Consistently asks patients for drug allergies'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Selects appropriate agent for therapeutic intervention',
              'Evaluates for potential adverse effects of pharmacotherapy and drug-to-drug interactions'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Considers array of drug therapy and selects appropriate agent based on mechanism of action and intended effect',
              'Recognizes and acts upon common adverse effects and interactions'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Selects the appropriate agent based on patient preferences, allergies, cost, policies, and clinical guidelines',
              'Recognizes and acts upon uncommon and unanticipated adverse effects and interactions'
            ]
          },
          {
            level: 5,
            descriptions: ['Participates in developing departmental and/or institutional policies on pharmacy and therapeutics']
          }
        ]
      },
      {
        id: 'PC6',
        name: 'Reassessment and Disposition',
        levels: [
          {
            level: 1,
            descriptions: [
              'Describes basic resources available (e.g., follow-up care, rehabilitation, transfer centers)',
              'Describes basic patient education plans',
              'Identifies the need for patient re-evaluation'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Makes a disposition decision for patients with routine conditions needing minimal resources',
              'Educates patients on simple discharge and admission plans',
              'Monitors that necessary diagnostic and therapeutic interventions are performed'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Makes a disposition decision for patients with routine conditions, with resource utilization',
              'Educates patients regarding diagnosis, treatment plan, medication review and primary care physician/consultant appointments',
              'Identifies which patients will require ongoing emergency department evaluation and evaluates the effectiveness of diagnostic and therapeutic interventions'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Makes disposition decision for patients with complex conditions, with resource utilization',
              'Educates patients on complex discharge and admission plans, including complex transfers',
              'Evaluates changes in clinical status during a patient\'s emergency department course'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Participates in institutional committees to develop systems that enhance safe patient disposition and maximizes resources',
              'Participates in the development of protocols to enhance patient safety'
            ]
          }
        ]
      },
      {
        id: 'PC7',
        name: 'Multitasking (Task-Switching)',
        levels: [
          {
            level: 1,
            descriptions: ['Manages a single patient amidst distractions']
          },
          {
            level: 2,
            descriptions: ['Task-switches between different patients of similar acuity']
          },
          {
            level: 3,
            descriptions: ['Employs task-switching in an efficient manner to manage multiple patients of varying acuity and at varying stages of work-up']
          },
          {
            level: 4,
            descriptions: ['Employs task-switching in an efficient manner to manage the emergency department']
          },
          {
            level: 5,
            descriptions: ['Employs task switching in an efficient manner to manage the emergency department under high-volume or surge situations']
          }
        ]
      },
      {
        id: 'PC8',
        name: 'General Approach to Procedures',
        levels: [
          {
            level: 1,
            descriptions: [
              'Identifies indications for a procedure and pertinent anatomy and physiology',
              'Performs basic therapeutic procedures (e.g., suturing, splinting)'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Assesses indications, risks, benefits, and alternatives and obtains informed consent in low-to moderate-risk situations',
              'Performs and interprets basic procedures, with assistance',
              'Recognizes common complications'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Assesses indications, risks, and benefits and weighs alternatives in high-risk situations',
              'Performs and interprets advanced procedures, with guidance',
              'Manages common complications'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Acts to mitigate modifiable risk factors in high-risk situations',
              'Independently performs and interprets advanced procedures',
              'Independently recognizes and manages complex and uncommon complications'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Teaches advanced procedures and independently performs rare, time-sensitive procedures',
              'Performs procedural peer review'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'MK',
    name: 'Medical Knowledge',
    subCompetencies: [
      {
        id: 'MK1',
        name: 'Scientific Knowledge',
        levels: [
          {
            level: 1,
            descriptions: ['Demonstrates scientific knowledge of common presentations and conditions']
          },
          {
            level: 2,
            descriptions: ['Demonstrates scientific knowledge of complex presentations and conditions']
          },
          {
            level: 3,
            descriptions: ['Integrates scientific knowledge of comorbid conditions for complex presentations']
          },
          {
            level: 4,
            descriptions: ['Integrates scientific knowledge of uncommon, atypical, or complex comorbid conditions for complex presentations']
          },
          {
            level: 5,
            descriptions: ['Pursues and integrates new and emerging knowledge']
          }
        ]
      },
      {
        id: 'MK2',
        name: 'Treatment and Clinical Reasoning',
        levels: [
          {
            level: 1,
            descriptions: [
              'Demonstrates knowledge of treatment of common conditions',
              'Identifies types of clinical reasoning errors within patient care, with substantial guidance'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Demonstrates knowledge of treatment of patients with complex conditions',
              'Identifies types of clinical reasoning errors within patient care'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Demonstrates knowledge of the impact of patient factors on treatment',
              'Applies clinical reasoning principles to retrospectively identify cognitive errors'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Demonstrates comprehensive knowledge of the varying patterns of disease presentation and alternative and adjuvant treatments of patients',
              'Continually re-appraises one\'s clinical reasoning to prospectively minimize cognitive errors and manage uncertainty'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Contributes to the body of knowledge on the varying patterns of disease presentation, and alternative and adjuvant treatments of patients',
              'Coaches others to recognize and avoid cognitive errors'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'SBP',
    name: 'Systems-Based Practice',
    subCompetencies: [
      {
        id: 'SBP1',
        name: 'Patient Safety',
        levels: [
          {
            level: 1,
            descriptions: [
              'Demonstrates knowledge of common patient safety events',
              'Demonstrates knowledge of how to report patient safety events'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Identifies system factors that lead to patient safety events',
              'Reports patient safety events through institutional reporting systems (simulated or actual)'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Participates in analysis of patient safety events (simulated or actual)',
              'Participates in disclosure of patient safety events to patients and families (simulated or actual)'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Conducts analysis of patient safety events and offers error prevention strategies (simulated or actual)',
              'Discloses patient safety events to patients and families (simulated or actual)'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Actively engages teams and processes to modify systems for preventing patient safety events',
              'Acts as a role model and/or mentor for others in the disclosing of patient safety events'
            ]
          }
        ]
      },
      {
        id: 'SBP2',
        name: 'Quality Improvement',
        levels: [
          {
            level: 1,
            descriptions: ['Demonstrates knowledge of basic quality improvement methodologies and metrics']
          },
          {
            level: 2,
            descriptions: ['Describes local quality improvement initiatives (e.g., emergency department throughput, testing turnaround times)']
          },
          {
            level: 3,
            descriptions: ['Participates in local quality improvement initiatives']
          },
          {
            level: 4,
            descriptions: ['Demonstrates the skills required for identifying, developing, implementing, and analyzing a quality improvement project']
          },
          {
            level: 5,
            descriptions: ['Creates, implements, and assesses quality improvement initiatives at the institutional or community level']
          }
        ]
      },
      {
        id: 'SBP3',
        name: 'System Navigation for Patient-Centered Care',
        levels: [
          {
            level: 1,
            descriptions: [
              'Demonstrates knowledge of care coordination',
              'Identifies key elements for safe and effective transitions of care and hand-offs',
              'Demonstrates knowledge of population and community health needs and disparities'
            ]
          },
          {
            level: 2,
            descriptions: [
              'In routine clinical situations, effectively coordinates patient care integrating the roles of interprofessional teams',
              'In routine clinical situations, enables safe and effective transitions of care/hand-offs',
              'Identifies specific population and community health needs and inequities for their local population'
            ]
          },
          {
            level: 3,
            descriptions: [
              'In complex clinical situations, effectively coordinates patient care by integrating the roles of the interprofessional teams',
              'In complex clinical situations, enables safe and effective transitions of care/hand-offs',
              'Effectively uses local resources to meet the needs of a patient population and community'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Serves as a role model, effectively coordinates patient-centered care among different disciplines and specialties',
              'Serves as a role model, advocates for safe and effective transitions of care/hand-offs within and across health care delivery systems, including outpatient settings',
              'Participates in changing and adapting practice to provide for the needs of specific populations'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Analyzes the process of care coordination and leads in the design and implementation of improvements',
              'Improves quality of transitions of care within and across health care delivery systems to optimize patient outcomes',
              'Leads innovations and advocates for populations and communities with health care inequities'
            ]
          }
        ]
      },
      {
        id: 'SBP4',
        name: 'Physician Role in Health Care Systems',
        levels: [
          {
            level: 1,
            descriptions: [
              'Identifies key components of the complex health care system (e.g., hospital, skilled nursing facility, finance, personnel, technology)',
              'Describes basic health payment systems, including (e.g., government, private, public, uninsured care) practice models'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Describes how components of a complex health care system are interrelated, and how this impacts patient care',
              'Delivers care with consideration of each patient\'s payment model (e.g., insurance type)',
              'Identifies basic knowledge domains required for medical practice (e.g., information technology, legal, billing, coding, financial, and personnel aspects)'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Discusses how individual practice affects the broader system (e.g., length of stay, readmission rates, clinical efficiency)',
              'Engages patients in shared decision making, informed by each patient\'s payment models',
              'Demonstrates efficient integration of information technology required for medical practice (e.g., electronic health record, documentation required for billing and coding)'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Manages various components of the complex health care system to provide efficient and effective patient care and the transition of care',
              'Advocates for patient care needs with consideration of the limitations of each patient\'s payment model',
              'Describes core administrative knowledge needed for the transition to practice (e.g., contract negotiation, malpractice insurance, government regulation, compliance)'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Advocates for or leads systems change that enhances high value, efficient, and effective patient care, and the transition of care',
              'Participates in health policy advocacy activities',
              'Analyzes individual practice patterns and professional requirements'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'PBLI',
    name: 'Practice-Based Learning and Improvement',
    subCompetencies: [
      {
        id: 'PBLI1',
        name: 'Evidence-Based and Informed Practice',
        levels: [
          {
            level: 1,
            descriptions: ['Demonstrates how to access and use available evidence']
          },
          {
            level: 2,
            descriptions: ['Articulates the clinical questions that are necessary to guide evidence-based care']
          },
          {
            level: 3,
            descriptions: ['Locates and applies the best available evidence, integrating it with patient preference, to the care of complex patients']
          },
          {
            level: 4,
            descriptions: ['Critically appraises and applies evidence even in the face of uncertainty and of conflicting evidence to guide care that is tailored to the individual patient']
          },
          {
            level: 5,
            descriptions: ['Coaches others to critically appraise and apply evidence for complex patients, and/or participates in the development of guidelines']
          }
        ]
      },
      {
        id: 'PBLI2',
        name: 'Reflective Practice and Commitment to Personal Growth',
        levels: [
          {
            level: 1,
            descriptions: ['Demonstrates an openness to performance data (feedback and other input)']
          },
          {
            level: 2,
            descriptions: [
              'Demonstrates an openness to performance data and uses it to develop personal and professional goals',
              'Identifies the factors that contribute to the gap(s) between expectations and actual performance'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Seeks and accepts performance data for developing personal and professional goals',
              'Analyzes and reflects upon the factors that contribute to gap(s) between expectations and actual performance'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Using performance data, continually improves and measures the effectiveness of one\'s personal and professional goals',
              'Analyzes, reflects on, and institutes behavioral change(s) to narrow the gap(s) between expectations and actual performance'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Acts as a role model for the development of personal and professional goals',
              'Coaches others on reflective practice'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'PROF',
    name: 'Professionalism',
    subCompetencies: [
      {
        id: 'PROF1',
        name: 'Professional Behavior and Ethical Principles',
        levels: [
          {
            level: 1,
            descriptions: [
              'Demonstrates professional behavior in routine situations and in how to report professionalism lapses',
              'Demonstrates knowledge of the ethical principles underlying patient care'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Identifies and describes potential triggers and takes responsibility for professionalism lapses',
              'Analyzes straightforward situations using ethical principles'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Exhibits professional behavior in complex and/or stressful situations',
              'Analyzes complex situations using ethical principles, and recognizes the need to seek help in managing and resolving them'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Sets apart those situations that might trigger professionalism lapses and intervenes to prevent them in oneself and others',
              'Uses appropriate resources for managing and resolving ethical dilemmas'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Coaches others when their behavior fails to meet professional expectations',
              'Identifies and addresses system-level factors that either induce or exacerbate ethical problems or impede their resolution'
            ]
          }
        ]
      },
      {
        id: 'PROF2',
        name: 'Accountability/Conscientiousness',
        levels: [
          {
            level: 1,
            descriptions: [
              'In routine situations, performs tasks and responsibilities with appropriate attention to detail',
              'Responds promptly to requests and reminders to complete tasks and responsibilities'
            ]
          },
          {
            level: 2,
            descriptions: [
              'In routine situations, performs tasks and responsibilities in a timely manner with appropriate attention to detail',
              'Takes responsibility for failure to complete tasks and responsibilities'
            ]
          },
          {
            level: 3,
            descriptions: [
              'In complex or stressful situations, performs tasks and responsibilities in a timely manner with appropriate attention to detail',
              'Recognizes situations that might impact one\'s own ability to complete tasks and responsibilities in a timely manner, and describes strategies for ensuring timely task completion in the future'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Recognizes situations that might impact others\' ability to complete tasks and responsibilities',
              'Proactively implements strategies to ensure that the needs of patients, teams, and systems are met'
            ]
          },
          {
            level: 5,
            descriptions: ['Takes ownership of system outcomes']
          }
        ]
      },
      {
        id: 'PROF3',
        name: 'Self-Awareness and Well-Being',
        levels: [
          {
            level: 1,
            descriptions: ['Recognizes, with assistance, the status of one\'s personal and professional well-being']
          },
          {
            level: 2,
            descriptions: ['Independently recognizes the status of one\'s personal and professional well-being and engages in help-seeking behaviors']
          },
          {
            level: 3,
            descriptions: ['With assistance, proposes a plan to optimize personal and professional well-being']
          },
          {
            level: 4,
            descriptions: ['Independently develops a plan to optimize one\'s personal and professional well-being']
          },
          {
            level: 5,
            descriptions: ['Coaches others when their emotional responses or level of knowledge/skills fail to meet professional expectations']
          }
        ]
      }
    ]
  },
  {
    id: 'ICS',
    name: 'Interpersonal and Communication Skills',
    subCompetencies: [
      {
        id: 'ICS1',
        name: 'Patient- and Family-Centered Communication',
        levels: [
          {
            level: 1,
            descriptions: [
              'Uses language and non-verbal behavior to reflect respect and establish rapport while accurately communicating one\'s own role within the health care system',
              'Identifies common barriers to effective communication (e.g., language, disability)',
              'With insight gained through an assessment of patient/family expectations coupled with an understanding of their health status and treatment options, adjusts one\'s communication strategies'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Establishes a therapeutic relationship in straightforward encounters with patients using active listening and clear language',
              'Identifies complex barriers to effective communication (e.g., health literacy, cultural, technology)',
              'Organizes and initiates communication with a patient/family by clarifying expectations and verifying one\'s understanding of the clinical situation'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Establishes a therapeutic relationship in challenging patient encounters',
              'When prompted, reflects on one\'s personal biases, while attempting to minimize communication barriers',
              'With guidance, sensitively and compassionately delivers medical information to patients, elicits patient/family values, learns their goals and preferences, and acknowledges uncertainty and conflict'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Easily establishes therapeutic relationships with patients, regardless of the complexity of cases',
              'Independently recognizes personal biases of patients, while attempting to proactively minimize communication barriers',
              'Independently uses shared decision making with a patient/family to align their values, goals, and preferences with potential treatment options and ultimately to achieve a personalized care plan'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Acts as a mentor to others in situational awareness and critical self-reflection with the aim of consistently developing positive therapeutic relationships and minimizing communication barriers',
              'Acts as a role model to exemplify shared decision making in patient/family communication that embodies various degrees of uncertainty/conflict'
            ]
          }
        ]
      },
      {
        id: 'ICS2',
        name: 'Interprofessional and Team Communication',
        levels: [
          {
            level: 1,
            descriptions: [
              'Respectfully requests a consultation',
              'Uses language that reflects the values all members of the health care team',
              'Receives feedback in a respectful manner'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Clearly and concisely requests a consultation or other resources for patient care',
              'Communicates information effectively with all health care team members',
              'Solicits feedback on performance as a member of the health care team'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Integrates recommendations made by various members of the health care team to optimize patient care',
              'Engages in active listening to adapt to the communication styles of the team',
              'Communicates concerns and provides feedback to peers and learners'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Acts as a role model for flexible communication strategies, i.e., those strategies that value input from all health care team members and that resolve conflict when needed',
              'Uses effective communication to lead or manage health care teams',
              'Communicates feedback and constructive criticism to superiors'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Acts as a role model for communication skills necessary to lead or manage health care teams',
              'In complex situations, facilitates regular health care team-based feedback'
            ]
          }
        ]
      },
      {
        id: 'ICS3',
        name: 'Communication within Health Care Systems',
        levels: [
          {
            level: 1,
            descriptions: [
              'Accurately documents information in the patient\'s record and safeguards the patient\'s personal information',
              'Communicates through appropriate channels as required by institutional policy (e.g., patient safety reports, cell phone/pager usage)'
            ]
          },
          {
            level: 2,
            descriptions: [
              'Demonstrates organized diagnostic and therapeutic reasoning through the patient record in a timely manner',
              'Respectfully communicates concerns about the system'
            ]
          },
          {
            level: 3,
            descriptions: [
              'Concisely reports diagnostic and therapeutic reasoning in the patient record',
              'Uses appropriate channels to offer clear and constructive suggestions for improving the system'
            ]
          },
          {
            level: 4,
            descriptions: [
              'Communicates clearly, concisely, and contemporaneously in an organized written form, including anticipatory guidance',
              'Initiates difficult conversations with appropriate stakeholders to improve the system'
            ]
          },
          {
            level: 5,
            descriptions: [
              'Models feedback to improve others\' written communication',
              'Facilitates dialogue regarding systems issues among larger community stakeholders (e.g., institution, the health care system, and/or the field)'
            ]
          }
        ]
      }
    ]
  }
];

// Helper functions for working with milestone data
export function getCompetencyById(id: string): Competency | undefined {
  return COMPETENCIES.find(comp => comp.id === id);
}

export function getSubCompetencyById(id: string): SubCompetency | undefined {
  for (const competency of COMPETENCIES) {
    const subComp = competency.subCompetencies.find(sub => sub.id === id);
    if (subComp) return subComp;
  }
  return undefined;
}

export function getAllSubCompetencies(): SubCompetency[] {
  return COMPETENCIES.flatMap(comp => comp.subCompetencies);
}

export function getSubCompetenciesByCompetency(competencyId: string): SubCompetency[] {
  const competency = getCompetencyById(competencyId);
  return competency ? competency.subCompetencies : [];
}