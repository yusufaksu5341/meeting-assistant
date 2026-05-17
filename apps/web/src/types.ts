export type MeetingStatus = 'PENDING' | 'JOINING' | 'RECORDING' | 'PROCESSING' | 'DONE' | 'FAILED'
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface Task {
  id: string
  meetingId: string
  assignee: string
  content: string
  deadline: string | null
  priority: Priority
  done: boolean
  createdAt: string
}

export interface Meeting {
  id: string
  userId: string
  botId: string | null
  platform: string
  title: string | null
  summary: string | null
  decisions: string[]
  status: MeetingStatus
  startedAt: string | null
  endedAt: string | null
  createdAt: string
}

export interface MeetingWithTasks extends Meeting {
  tasks: Task[]
}
