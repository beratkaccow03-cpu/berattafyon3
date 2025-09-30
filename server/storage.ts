//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
import { type Task, type InsertTask, type Mood, type InsertMood, type Goal, type InsertGoal, type QuestionLog, type InsertQuestionLog, type ExamResult, type InsertExamResult, type ExamSubjectNet, type InsertExamSubjectNet, type StudyHours, type InsertStudyHours } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Görev işlemleri
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  toggleTaskComplete(id: string): Promise<Task | undefined>;
  getTasksByDate(dateISO: string): Promise<Task[]>;
  getDailySummary(rangeDays: number): Promise<any>;
  
  // Ruh hali işlemleri
  getMoods(): Promise<Mood[]>;
  getLatestMood(): Promise<Mood | undefined>;
  createMood(mood: InsertMood): Promise<Mood>;

  // Hedef işlemleri
  getGoals(): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, updates: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<boolean>;
  
  // Soru günlüğü işlemi
  getQuestionLogs(): Promise<QuestionLog[]>;
  createQuestionLog(log: InsertQuestionLog): Promise<QuestionLog>;
  getQuestionLogsByDateRange(startDate: string, endDate: string): Promise<QuestionLog[]>;
  deleteQuestionLog(id: string): Promise<boolean>;
  deleteAllQuestionLogs(): Promise<boolean>;
  
  // konu istatistikleri işlemleri
  getTopicStats(): Promise<Array<{ topic: string; wrongMentions: number; totalSessions: number; mentionFrequency: number }>>;
  getPriorityTopics(): Promise<Array<{ topic: string; wrongMentions: number; mentionFrequency: number; priority: 'critical' | 'high' | 'medium' | 'low'; color: string }>>;
  getSubjectSolvedStats(): Promise<Array<{ subject: string; totalQuestions: number; totalTimeMinutes: number; averageTimePerQuestion: number }>>;
  
  // Sınav sonucu işlemleri
  getExamResults(): Promise<ExamResult[]>;
  createExamResult(result: InsertExamResult): Promise<ExamResult>;
  deleteExamResult(id: string): Promise<boolean>;
  deleteAllExamResults(): Promise<boolean>;
  
  // Sınav konusu network işlemleri
  getExamSubjectNets(): Promise<ExamSubjectNet[]>;
  getExamSubjectNetsByExamId(examId: string): Promise<ExamSubjectNet[]>;
  createExamSubjectNet(examSubjectNet: InsertExamSubjectNet): Promise<ExamSubjectNet>;
  updateExamSubjectNet(id: string, updates: Partial<InsertExamSubjectNet>): Promise<ExamSubjectNet | undefined>;
  deleteExamSubjectNet(id: string): Promise<boolean>;
  deleteExamSubjectNetsByExamId(examId: string): Promise<boolean>;
  
  // Çalışma saati işlemleri
  getStudyHours(): Promise<StudyHours[]>;
  getStudyHoursByDate(date: string): Promise<StudyHours | undefined>;
  createStudyHours(studyHours: InsertStudyHours): Promise<StudyHours>;
  updateStudyHours(id: string, updates: Partial<InsertStudyHours>): Promise<StudyHours | undefined>;
  deleteStudyHours(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private tasks: Map<string, Task>;
  private moods: Map<string, Mood>;
  private goals: Map<string, Goal>;
  private questionLogs: Map<string, QuestionLog>;
  private examResults: Map<string, ExamResult>;
  private examSubjectNets: Map<string, ExamSubjectNet>;
  private studyHours: Map<string, StudyHours>;

  constructor() {
    this.tasks = new Map();
    this.moods = new Map();
    this.goals = new Map();
    this.questionLogs = new Map();
    this.examResults = new Map();
    this.examSubjectNets = new Map();
    this.studyHours = new Map();
    
    // Bazı örnek hedeflerle başlatın
    this.initializeSampleGoals();
  }
  
  private async initializeSampleGoals() {
    const sampleGoals = [
      {
        title: "TYT Net Hedefi",
        description: "2026 TYT'de 75 net hedefliyorum",
        targetValue: "75",
        currentValue: "68.75",
        unit: "net",
        category: "tyt" as const,
        timeframe: "aylık" as const,
        targetDate: "2026-06-20"
      },
      {
        title: "AYT Net Hedefi",
        description: "2026 AYT'de 60 net hedefliyorum",
        targetValue: "60",
        currentValue: "45.50",
        unit: "net",
        category: "ayt" as const,
        timeframe: "aylık" as const,
        targetDate: "2026-06-21"
      },
      {
        title: "Sıralama Hedefi",
        description: "10.000'inci sıranın üstünde olmak istiyorum",
        targetValue: "10000",
        currentValue: "15750",
        unit: "sıralama",
        category: "siralama" as const,
        timeframe: "yıllık" as const,
        targetDate: "2026-06-21"
      }
    ];
    
    for (const goal of sampleGoals) {
      await this.createGoal(goal);
    }
  }

  // Görev işlemleri
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).sort((a, b) => {
      // Öncelik sırasına göre (yüksek -> orta -> düşük) ve ardından oluşturulma tarihine göre sırala
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      id,
      title: insertTask.title,
      description: insertTask.description ?? null,
      priority: insertTask.priority ?? "medium",
      category: insertTask.category ?? "genel",
      color: insertTask.color ?? "#8B5CF6", // mor
      completed: insertTask.completed ?? false,
      completedAt: null,
      dueDate: insertTask.dueDate ?? null,
      recurrenceType: insertTask.recurrenceType ?? "none",
      recurrenceEndDate: insertTask.recurrenceEndDate ?? null,
      createdAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      return undefined;
    }

    const updatedTask: Task = {
      ...existingTask,
      ...updates,
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async toggleTaskComplete(id: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }

    const updatedTask: Task = {
      ...task,
      completed: !task.completed,
      completedAt: !task.completed ? new Date().toISOString() : null,
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Ruh hali işlemleri
  async getMoods(): Promise<Mood[]> {
    return Array.from(this.moods.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getLatestMood(): Promise<Mood | undefined> {
    const moods = await this.getMoods();
    return moods[0];
  }

  async createMood(insertMood: InsertMood): Promise<Mood> {
    const id = randomUUID();
    const mood: Mood = {
      id,
      mood: insertMood.mood,
      moodBg: insertMood.moodBg ?? null,
      note: insertMood.note ?? null,
      createdAt: new Date(),
    };
    this.moods.set(id, mood);
    return mood;
  }

  // Yeni işlevsellik için yöntemler
  async getTasksByDate(dateISO: string): Promise<Task[]> {
    const tasks = await this.getTasks();
    const today = new Date().toISOString().split('T')[0];
    
    return tasks.filter(task => {
      // Eğer görevin son tarihi varsa, istenen tarihle eşleşip eşleşmediğini kontrol et
      if (task.dueDate) {
        const taskDate = task.dueDate.split('T')[0];
        return taskDate === dateISO;
      }

      // Görevin son tarihi yoksa, bugün için tüm görevleri göster (tamamlanmış veya bekleyen)
      if (dateISO === today) {
        return true; // Bugün için tüm görevleri göster
      }
      
      return false;
    });
  }

  async getDailySummary(rangeDays: number = 30): Promise<any> {
    const tasks = await this.getTasks();
    const moods = await this.getMoods();
    
    const today = new Date();
    const summaryData = [];
    
    for (let i = 0; i < rangeDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTasks = tasks.filter(task => {
        if (!task.completedAt) return false;
        const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
        return completedDate === dateStr;
      });
      
      const dayMoods = moods.filter(mood => {
        if (!mood.createdAt) return false;
        const moodDate = new Date(mood.createdAt).toISOString().split('T')[0];
        return moodDate === dateStr;
      });
      
      summaryData.push({
        date: dateStr,
        tasksCompleted: dayTasks.length,
        totalTasks: tasks.filter(task => {
          if (!task.createdAt) return false;
          const createdDate = new Date(task.createdAt).toISOString().split('T')[0];
          return createdDate <= dateStr;
        }).length,
        moods: dayMoods,
        productivity: dayTasks.length > 0 ? Math.min(dayTasks.length * 20, 100) : 0
      });
    }
    
    return summaryData;
  }
  
  // Hedef operasyonları
  async getGoals(): Promise<Goal[]> {
    return Array.from(this.goals.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    return this.goals.get(id);
  }

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const id = randomUUID();
    const goal: Goal = {
      id,
      title: insertGoal.title,
      description: insertGoal.description ?? null,
      category: insertGoal.category ?? "genel",
      targetDate: insertGoal.targetDate ?? null,
      completed: insertGoal.completed ?? false,
      currentValue: insertGoal.currentValue ?? "0",
      targetValue: insertGoal.targetValue ?? "100",
      unit: insertGoal.unit ?? "net",
      timeframe: insertGoal.timeframe ?? "aylık",
      createdAt: new Date(),
    };
    this.goals.set(id, goal);
    return goal;
  }

  async updateGoal(id: string, updates: Partial<InsertGoal>): Promise<Goal | undefined> {
    const existingGoal = this.goals.get(id);
    if (!existingGoal) {
      return undefined;
    }

    const updatedGoal: Goal = {
      ...existingGoal,
      ...updates,
    };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }

  async deleteGoal(id: string): Promise<boolean> {
    return this.goals.delete(id);
  }

  // Soru günlüğü işlemleri
  async getQuestionLogs(): Promise<QuestionLog[]> {
    return Array.from(this.questionLogs.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async createQuestionLog(insertLog: InsertQuestionLog): Promise<QuestionLog> {
    const id = randomUUID();
    
    // Yanlış konuları normalleştirerek konu öneklerini kaldırın
    const normalizedWrongTopics = insertLog.wrong_topics ? 
      insertLog.wrong_topics.map(topic => this.normalizeTopic(topic)) : [];
    
    const log: QuestionLog = {
      id,
      exam_type: insertLog.exam_type,
      subject: insertLog.subject,
      topic: insertLog.topic ?? null,
      correct_count: insertLog.correct_count,
      wrong_count: insertLog.wrong_count,
      blank_count: insertLog.blank_count ?? "0",
      wrong_topics: normalizedWrongTopics,
      wrong_topics_json: insertLog.wrong_topics_json ?? null,
      time_spent_minutes: insertLog.time_spent_minutes ?? null,
      study_date: insertLog.study_date,
      createdAt: new Date(),
    };
    this.questionLogs.set(id, log);
    return log;
  }

  async getQuestionLogsByDateRange(startDate: string, endDate: string): Promise<QuestionLog[]> {
    const logs = Array.from(this.questionLogs.values());
    return logs.filter(log => {
      const logDate = log.study_date;
      return logDate >= startDate && logDate <= endDate;
    }).sort((a, b) => new Date(b.study_date).getTime() - new Date(a.study_date).getTime());
  }

  async deleteQuestionLog(id: string): Promise<boolean> {
    return this.questionLogs.delete(id);
  }

  async deleteAllQuestionLogs(): Promise<boolean> {
    this.questionLogs.clear();
    return true;
  }
  
  // Sınav sonucu işlemleri
  async getExamResults(): Promise<ExamResult[]> {
    return Array.from(this.examResults.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async createExamResult(insertResult: InsertExamResult): Promise<ExamResult> {
    const id = randomUUID();
    const result: ExamResult = {
      id,
      exam_name: insertResult.exam_name,
      exam_date: insertResult.exam_date,
      exam_type: insertResult.exam_type ?? null,
      notes: insertResult.notes ?? null,
      ranking: insertResult.ranking ?? null,
      tyt_net: insertResult.tyt_net ?? "0",
      ayt_net: insertResult.ayt_net ?? "0",
      subjects_data: insertResult.subjects_data ?? null,
      createdAt: new Date(),
    };
    this.examResults.set(id, result);
    return result;
  }

  async deleteExamResult(id: string): Promise<boolean> {
    const deleted = this.examResults.delete(id);
    if (deleted) {
      // İlişkili sınav konu netlerini cascade olarak sil
      await this.deleteExamSubjectNetsByExamId(id);
    }
    return deleted;
  }

  async deleteAllExamResults(): Promise<boolean> {
    this.examResults.clear();
    this.examSubjectNets.clear(); // Ayrıca tüm konu ağlarını temizle
    return true;
  }
  // Flashcard işlemleri (silinecek)
  
  // TYT/AYT konu öneklerini kaldırarak konu adlarını normalleştirin
  private normalizeTopic(topic: string): string {
    // TYT veya AYT ile başlayan ve ardından herhangi bir karakter dizisi, boşluk, tire ve ardından gerçek konu adı gelen konuları normalleştir
    return topic.replace(/^(TYT|AYT)\s+[^-]+\s+-\s+/, '').trim();
  }

  // Konu istatistik işlemleri (kullanıcılar tarafından belirtilen belirli yanlış konular)
  async getTopicStats(): Promise<Array<{ topic: string; wrongMentions: number; totalSessions: number; mentionFrequency: number }>> {
    const logs = Array.from(this.questionLogs.values());
    const examResults = Array.from(this.examResults.values());
    const topicStats = new Map<string, { wrongMentions: number; sessionsAppeared: Set<string> }>();

    // Süreç soru günlükleri
    logs.forEach(log => {
      // Sadece özellikle belirtilen yanlış konuları takip et, genel konuları değil
      if (log.wrong_topics && log.wrong_topics.length > 0) {
        log.wrong_topics.forEach(topic => {
          const normalizedTopic = this.normalizeTopic(topic);
          if (!topicStats.has(normalizedTopic)) {
            topicStats.set(normalizedTopic, { wrongMentions: 0, sessionsAppeared: new Set() });
          }
          const topicStat = topicStats.get(normalizedTopic)!;
          topicStat.wrongMentions += 1; // Bu konunun yanlış olarak ne kadar sıklıkla belirtildiğini say
          topicStat.sessionsAppeared.add(log.id); // Bu konunun göründüğü benzersiz oturumları takip et
        });
      }
    });

    // Süreç sınav sonuçları yanlış konuları
    examResults.forEach(exam => {
      if (exam.subjects_data) {
        try {
          const subjectsData = JSON.parse(exam.subjects_data);
          Object.values(subjectsData).forEach((subjectData: any) => {
            if (subjectData.wrong_topics && Array.isArray(subjectData.wrong_topics)) {
              subjectData.wrong_topics.forEach((topic: string) => {
                if (topic && topic.trim().length > 0) {
                  const normalizedTopic = this.normalizeTopic(topic);
                  if (!topicStats.has(normalizedTopic)) {
                    topicStats.set(normalizedTopic, { wrongMentions: 0, sessionsAppeared: new Set() });
                  }
                  const topicStat = topicStats.get(normalizedTopic)!;
                  topicStat.wrongMentions += 2; // Ağırlık hataları daha yüksek (2 kat)
                  topicStat.sessionsAppeared.add(`exam_${exam.id}`);
                }
              });
            }
          });
        } catch (e) {
          // Bozuk JSON'ları atla
        }
      }
    });

    const totalSessions = logs.length;
    
    return Array.from(topicStats.entries())
      .map(([topic, stats]) => ({
        topic,
        wrongMentions: stats.wrongMentions,
        totalSessions: stats.sessionsAppeared.size,
        mentionFrequency: totalSessions > 0 ? (stats.sessionsAppeared.size / totalSessions) * 100 : 0
      }))
      .filter(stat => stat.wrongMentions >= 2) // Gürültüyü önlemek için en az iki kez bahsedilen konuları göster
      .sort((a, b) => b.wrongMentions - a.wrongMentions);
  }

  async getPriorityTopics(): Promise<Array<{ topic: string; wrongMentions: number; mentionFrequency: number; priority: 'critical' | 'high' | 'medium' | 'low'; color: string }>> {
    const topicStats = await this.getTopicStats();
    
    return topicStats.map(stat => {
      let priority: 'critical' | 'high' | 'medium' | 'low';
      let color: string;
      
      // Yanlış bahsetme sayısı ve sıklığına göre öncelik
      if (stat.wrongMentions >= 10 || stat.mentionFrequency >= 50) {
        priority = 'critical';
        color = '#DC2626'; // Kırmızı
      } else if (stat.wrongMentions >= 6 || stat.mentionFrequency >= 30) {
        priority = 'high';
        color = '#EA580C'; // Turuncu
      } else if (stat.wrongMentions >= 3 || stat.mentionFrequency >= 15) {
        priority = 'medium';
        color = '#D97706'; // Amber
      } else {
        priority = 'low';
        color = '#16A34A'; // Yeşil
      }
      
      return {
        topic: stat.topic,
        wrongMentions: stat.wrongMentions,
        mentionFrequency: stat.mentionFrequency,
        priority,
        color
      };
    });
  }

  async getSubjectSolvedStats(): Promise<Array<{ subject: string; totalQuestions: number; totalTimeMinutes: number; averageTimePerQuestion: number }>> {
    const logs = Array.from(this.questionLogs.values());
    const subjectStats = new Map<string, { totalQuestions: number; totalTimeMinutes: number }>();

    logs.forEach(log => {
      const totalQuestions = parseInt(log.correct_count) + parseInt(log.wrong_count) + parseInt(log.blank_count || "0");
      const timeSpent = log.time_spent_minutes || 0;
      
      if (!subjectStats.has(log.subject)) {
        subjectStats.set(log.subject, { totalQuestions: 0, totalTimeMinutes: 0 });
      }
      
      const stats = subjectStats.get(log.subject)!;
      stats.totalQuestions += totalQuestions;
      stats.totalTimeMinutes += timeSpent;
    });

    return Array.from(subjectStats.entries())
      .map(([subject, stats]) => ({
        subject,
        totalQuestions: stats.totalQuestions,
        totalTimeMinutes: stats.totalTimeMinutes,
        averageTimePerQuestion: stats.totalQuestions > 0 ? stats.totalTimeMinutes / stats.totalQuestions : 0
      }))
      .filter(stat => stat.totalQuestions > 0)
      .sort((a, b) => b.totalQuestions - a.totalQuestions);
  }

  // Yanlış bahsetme sayısı ve sıklığına göre öncelikSınav konusu ağ işlemleri
  async getExamSubjectNets(): Promise<ExamSubjectNet[]> {
    return Array.from(this.examSubjectNets.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getExamSubjectNetsByExamId(examId: string): Promise<ExamSubjectNet[]> {
    return Array.from(this.examSubjectNets.values())
      .filter(net => net.exam_id === examId)
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }

  async createExamSubjectNet(insertNet: InsertExamSubjectNet): Promise<ExamSubjectNet> {
    // Sınavın varlığını doğrulayın
    const examExists = this.examResults.has(insertNet.exam_id);
    if (!examExists) {
      throw new Error(`Exam with id ${insertNet.exam_id} does not exist`);
    }
    
    const id = randomUUID();
    const examSubjectNet: ExamSubjectNet = {
      id,
      exam_id: insertNet.exam_id,
      exam_type: insertNet.exam_type,
      subject: insertNet.subject,
      net_score: insertNet.net_score,
      correct_count: insertNet.correct_count ?? "0",
      wrong_count: insertNet.wrong_count ?? "0",
      blank_count: insertNet.blank_count ?? "0",
      createdAt: new Date(),
    };
    this.examSubjectNets.set(id, examSubjectNet);
    return examSubjectNet;
  }

  async updateExamSubjectNet(id: string, updates: Partial<InsertExamSubjectNet>): Promise<ExamSubjectNet | undefined> {
    const existing = this.examSubjectNets.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: ExamSubjectNet = {
      ...existing,
      ...updates,
    };
    this.examSubjectNets.set(id, updated);
    return updated;
  }

  async deleteExamSubjectNet(id: string): Promise<boolean> {
    return this.examSubjectNets.delete(id);
  }

  async deleteExamSubjectNetsByExamId(examId: string): Promise<boolean> {
    const netsToDelete = Array.from(this.examSubjectNets.entries())
      .filter(([_, net]) => net.exam_id === examId);
    
    let deletedAny = false;
    for (const [id, _] of netsToDelete) {
      if (this.examSubjectNets.delete(id)) {
        deletedAny = true;
      }
    }
    return deletedAny;
  }

  // Çalışma saati işlemleri
  async getStudyHours(): Promise<StudyHours[]> {
    return Array.from(this.studyHours.values()).sort((a, b) => 
      new Date(b.study_date).getTime() - new Date(a.study_date).getTime()
    );
  }

  async getStudyHoursByDate(date: string): Promise<StudyHours | undefined> {
    return Array.from(this.studyHours.values()).find(sh => sh.study_date === date);
  }

  async createStudyHours(insertHours: InsertStudyHours): Promise<StudyHours> {
    const id = randomUUID();
    const studyHours: StudyHours = {
      id,
      study_date: insertHours.study_date,
      hours: insertHours.hours ?? 0,
      minutes: insertHours.minutes ?? 0,
      seconds: insertHours.seconds ?? 0,
      createdAt: new Date(),
    };
    this.studyHours.set(id, studyHours);
    return studyHours;
  }

  async updateStudyHours(id: string, updates: Partial<InsertStudyHours>): Promise<StudyHours | undefined> {
    const existing = this.studyHours.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: StudyHours = {
      ...existing,
      ...updates,
    };
    this.studyHours.set(id, updated);
    return updated;
  }

  async deleteStudyHours(id: string): Promise<boolean> {
    return this.studyHours.delete(id);
  }
}
export const storage = new MemStorage();
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
