//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
import { useState, useEffect, useMemo, useCallback } from "react";
import { Header } from "@/components/header";
import { EnhancedWeatherWidget } from "@/components/enhanced-weather-widget";
import { CountdownWidget } from "@/components/countdown-widget";
import { TodaysTasksWidget } from "@/components/todays-tasks-widget";
import { Calendar, TrendingUp, Clock, ChevronLeft, ChevronRight, Mail, Zap, FileText, Send } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Task, QuestionLog, ExamResult } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Saatli Ortalanmış Karşılama Bölümü Bileşeni
function CenteredWelcomeSection() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Her saniye güncelleme zamanı
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Sakarya Serdivan (Türkiye saat dilimi) için tarih ve saat formatlama
  const formatDateTime = () => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Istanbul',
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    };
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    const dateStr = currentTime.toLocaleDateString('tr-TR', options);
    const timeStr = currentTime.toLocaleTimeString('tr-TR', timeOptions);
    
    return { dateStr, timeStr };
  };

  const { dateStr, timeStr } = formatDateTime();

  return (
    <div className="space-y-8">
      {/* Hoşgeldin Mesajı */}
      <div className="space-y-2">
        <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 via-violet-700 to-black dark:from-purple-400 dark:via-violet-500 dark:to-gray-300 bg-clip-text text-transparent">
          Hoşgeldiniz Berat Çakıroğlu
        </h1>
      </div>
      
      {/* Ortalanmış Saat ve Saat Göstergesi */}
      <div className="flex flex-col items-center space-y-6">
        {/* Zaman ve Saat Konteyneri - Mükemmel Ortalanmış */}
        <div className="flex items-center justify-center space-x-6">
          {/* Geliştirilmiş Saat İkonu - Zaman ile Ortalanmış */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-violet-600/30 to-black/40 rounded-3xl blur-2xl animate-pulse"></div>
            <div className="relative w-20 h-20 bg-black/10 dark:bg-purple-950/20 backdrop-blur-xl border border-purple-500/20 dark:border-purple-400/20 rounded-3xl flex items-center justify-center shadow-2xl">
              <Clock className="h-12 w-12 text-purple-600 dark:text-purple-400 drop-shadow-lg" />
            </div>
          </div>
          
          {/* Mor-Siyah Gradyanlı Geliştirilmiş Saat Göstergesi - Ortalanmış */}
          <div className="text-8xl font-black bg-gradient-to-r from-purple-600 via-violet-700 to-black dark:from-purple-400 dark:via-violet-500 dark:to-gray-300 bg-clip-text text-transparent font-mono tracking-tighter drop-shadow-lg" data-testid="text-time-center">
            {timeStr}
          </div>
        </div>
        
        {/* Stilize Tarih ve Konum - Sola Hizalı ve Ortalanmış */}
        <div className="flex items-center justify-center space-x-4 text-2xl font-semibold">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 shadow-lg animate-pulse"></div>
            <span className="bg-gradient-to-r from-purple-800 to-black dark:from-purple-300 dark:to-gray-200 bg-clip-text text-transparent font-bold" data-testid="text-date-center">
              {dateStr}
            </span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <span className="text-lg">📍</span>
            <span className="font-bold bg-gradient-to-r from-purple-600 to-violet-700 dark:from-purple-400 dark:to-violet-500 bg-clip-text text-transparent">
              Sakarya, Serdivan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Homepage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [activityFilter, setActivityFilter] = useState<'all' | 'tasks' | 'questions' | 'exams'>('all');
  
  // Stakvim navigasyonu için durum (güncel tarihten ayrı)
  const currentDate = new Date();
  const [displayYear, setDisplayYear] = useState(currentDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(currentDate.getMonth());
  
  // Kategori isimlerini düzgün formatta gösterecek fonksiyon
  const getCategoryText = (category: string) => {
    switch (category) {
      case "genel":
        return "Genel";
      case "turkce":
        return "Türkçe";
      case "sosyal":
        return "Sosyal Bilimler";
      case "matematik":
        return "Matematik";
      case "fizik":
        return "Fizik";
      case "kimya":
        return "Kimya";
      case "biyoloji":
        return "Biyoloji";
      case "tyt-geometri":
        return "TYT Geometri";
      case "ayt-geometri":
        return "AYT Geometri";
      case "ayt-matematik":
        return "AYT Matematik";
      case "ayt-fizik":
        return "AYT Fizik";
      case "ayt-kimya":
        return "AYT Kimya";
      case "ayt-biyoloji":
        return "AYT Biyoloji";
      default:
        return category;
    }
  };
  
  // Modal durumları raporla
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportActivated, setReportActivated] = useState(false);
  const [timeUntilMonthEnd, setTimeUntilMonthEnd] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [autoEmailSent, setAutoEmailSent] = useState(false);
  
  const { toast } = useToast();

  // Ay sonuna kadar kalan süreyi hesapla
  const calculateTimeUntilMonthEnd = useCallback(() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const timeDiff = endOfMonth.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  }, []);

  // Saniye başına geri sayımı güncelle
  useEffect(() => {
    const updateCountdown = () => {
      const timeLeft = calculateTimeUntilMonthEnd();
      setTimeUntilMonthEnd(timeLeft);
      
      // Ayın sonunda otomatik olarak e-posta gönder
      if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0 && !autoEmailSent) {
        setAutoEmailSent(true);
        handleAutoSendEmail();
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, [calculateTimeUntilMonthEnd, autoEmailSent]);

  // Ay sonunda otomatik olarak e-posta gönder
  const handleAutoSendEmail = async () => {
    try {
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const monthlyTasks = allTasks.filter(task => {
        if (task.completedAt) {
          const completedDate = new Date(task.completedAt);
          return completedDate >= startOfMonth && completedDate <= endOfMonth;
        }
        return false;
      });

      const monthlyQuestionLogs = questionLogs.filter((log: any) => {
        if (log.study_date) {
          const logDate = new Date(log.study_date);
          return logDate >= startOfMonth && logDate <= endOfMonth;
        }
        return false;
      });

      const monthlyExamResults = examResults.filter((exam: any) => {
        if (exam.exam_date) {
          const examDate = new Date(exam.exam_date);
          return examDate >= startOfMonth && examDate <= endOfMonth;
        }
        return false;
      });

      // Calculate comprehensive statistics for auto-send
      const totalQuestions = monthlyQuestionLogs.reduce((sum: number, log: any) => 
        sum + parseInt(log.correct_count || '0') + parseInt(log.wrong_count || '0') + parseInt(log.blank_count || '0'), 0
      );
      const totalCorrect = monthlyQuestionLogs.reduce((sum: number, log: any) => 
        sum + parseInt(log.correct_count || '0'), 0
      );
      const totalWrong = monthlyQuestionLogs.reduce((sum: number, log: any) => 
        sum + parseInt(log.wrong_count || '0'), 0
      );

      // Hata yapılan konuları topla ve sırala
      const wrongTopicsMap: Record<string, { count: number, subject: string }> = {};
      monthlyQuestionLogs.forEach((log: any) => {
        const wrongTopics = log.wrong_topics || [];
        wrongTopics.forEach((topic: string) => {
          if (!wrongTopicsMap[topic]) {
            wrongTopicsMap[topic] = { count: 0, subject: log.subject || 'Bilinmeyen' };
          }
          wrongTopicsMap[topic].count++;
        });
      });

      const frequentWrongTopics = Object.entries(wrongTopicsMap)
        .map(([topic, data]) => ({ topic, count: data.count, subject: data.subject }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Rekor deneme netleri hesapla
      const tytExams = monthlyExamResults.filter((exam: any) => exam.exam_type === 'TYT');
      const aytExams = monthlyExamResults.filter((exam: any) => exam.exam_type === 'AYT');
      
      const maxTytNet = tytExams.length > 0 
        ? Math.max(...tytExams.map((exam: any) => parseFloat(exam.tyt_net || '0')))
        : 0;
      const maxAytNet = aytExams.length > 0
        ? Math.max(...aytExams.map((exam: any) => parseFloat(exam.ayt_net || '0')))
        : 0;

      // Deneme detaylarını hazırla (subjectNets ile birlikte)
      const examDetailsWithSubjects = monthlyExamResults.map((exam: any) => ({
        ...exam,
        subjects: exam.subjects_data || []
      }));

      const comprehensiveReportData = {
        totalTasks: monthlyTasks.length,
        totalQuestions: totalQuestions,
        correctAnswers: totalCorrect,
        wrongAnswers: totalWrong,
        totalExams: monthlyExamResults.length,
        totalActivities: monthlyTasks.length + monthlyQuestionLogs.length + monthlyExamResults.length,
        month: currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
        date: currentDate.toLocaleDateString('tr-TR'),
        tasks: monthlyTasks,
        questionLogs: monthlyQuestionLogs,
        examResults: monthlyExamResults,
        examDetailsWithSubjects: examDetailsWithSubjects,
        frequentWrongTopics: frequentWrongTopics,
        maxTytNet: maxTytNet,
        maxAytNet: maxAytNet,
        user: {
          name: 'Berat Çakıroğlu',
          email: 'beratkaccow03@gmail.com'
        }
      };

      // Send data in correct format for auto-send
      const emailRequest = {
        email: 'beratkaccow03@gmail.com',
        phone: '+90 555 123 45 67',
        reportData: comprehensiveReportData
      };

      const response = await fetch("/api/send-report", {
        method: "POST",
        body: JSON.stringify(emailRequest),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "🎉 Otomatik Aylık Rapor!",
          description: "Aylık rapor otomatik olarak gönderildi: " + result.message,
          duration: 10000,
        });
      }
    } catch (error) {
      console.error('Auto email error:', error);
    }
  };

  // E-posta gönderme mutasyonu
  const sendEmailMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const response = await fetch("/api/send-report", {
        method: "POST",
        body: JSON.stringify(reportData),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Detaylı hata bilgisini exception olarak fırlat
        const error: any = new Error(result.message || "E-posta gönderilemedi");
        error.details = result.details;
        error.instructions = result.instructions;
        error.help = result.help;
        throw error;
      }
      
      return result;
    },
    onSuccess: (response) => {
      toast({
        title: response.message || "✅ Rapor Gönderildi!",
        description: response.details || "E-posta başarıyla gönderildi.",
        duration: 3000,
      });
      setShowReportModal(false);
    },
    onError: (error: any) => {
      // Detaylı hata mesajını göster
      let description = error?.message || "E-posta gönderilirken hata oluştu.";
      
      if (error.details) {
        description = error.details;
      }
      
      if (error.instructions) {
        description += "\n\n" + error.instructions;
      }
      
      if (error.help) {
        description += "\n\n" + error.help;
      }
      
      toast({
        title: error?.message || "Hata!",
        description: description,
        variant: "destructive",
        duration: 15000, // Daha uzun süre göster
      });
    },
  });

  const { data: calendarData } = useQuery<{
    date: string;
    dayNumber: number;
    daysRemaining: number;
    tasks: Task[];
    tasksCount: number;
  }>({
    queryKey: ["/api/calendar", selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;
      const response = await fetch(`/api/calendar/${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch calendar data');
      return response.json();
    },
    enabled: !!selectedDate,
  });

  // Tüm görevleri, soru kayıtlarını ve sınav sonuçlarını almak için sorgu
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  
  const { data: questionLogs = [] } = useQuery<QuestionLog[]>({
    queryKey: ["/api/question-logs"],
  });
  
  const { data: examResults = [] } = useQuery<ExamResult[]>({
    queryKey: ["/api/exam-results"],
  });

  // Takvim günlerini önbelleğe almak için memoize edilmiş oluşturma
  const calendarDays = useMemo(() => {
    const year = displayYear;
    const month = displayMonth;
    const firstDay = new Date(year, month, 1);
    
    // Pazartesi gününden başlayın (haftalık düzenlemeyi sabitleyin)
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  }, [displayYear, displayMonth]);

  // Güncel tarih sabitleri için karşılaştırma
  const today = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Optimize edilmiş gezinme işlevleri için useCallback kullanımı
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setDisplayMonth(prev => prev === 0 ? 11 : prev - 1);
      setDisplayYear(prev => displayMonth === 0 ? prev - 1 : prev);
    } else {
      setDisplayMonth(prev => prev === 11 ? 0 : prev + 1);
      setDisplayYear(prev => displayMonth === 11 ? prev + 1 : prev);
    }
  }, [displayMonth]);

  // Yeniden hesaplamayı önlemek için belleğe alınmış etkinlik kontrolü
  const hasActivities = useCallback((date: Date) => {
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    // Tamamlanan görevleri kontrol edin
    const hasCompletedTasks = allTasks.some(task => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
      return completedDate === dateStr;
    });
    
    // Planlanmış görevleri kontrol et (due date'i olan görevler)
    const hasScheduledTasks = allTasks.some(task => {
      if (!task.dueDate) return false;
      const taskDate = task.dueDate.split('T')[0];
      return taskDate === dateStr;
    });
    
    // Soru günlüklerini kontrol et
    const hasQuestionLogs = questionLogs.some(log => log.study_date === dateStr);
    
    // Sınav sonuçlarını kontrol et
    const hasExamResults = examResults.some(exam => exam.exam_date === dateStr);
    
    return hasCompletedTasks || hasScheduledTasks || hasQuestionLogs || hasExamResults;
  }, [allTasks, questionLogs, examResults]);

  // Belirli bir tarih için etkinlikleri al
  const getActivitiesForDate = useCallback((date: Date) => {
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    const completedTasks = allTasks.filter(task => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
      return completedDate === dateStr;
    });
    
    const dayQuestionLogs = questionLogs.filter(log => log.study_date === dateStr);
    const dayExamResults = examResults.filter(exam => exam.exam_date === dateStr);
    
    return {
      tasks: completedTasks,
      questionLogs: dayQuestionLogs,
      examResults: dayExamResults,
      total: completedTasks.length + dayQuestionLogs.length + dayExamResults.length
    };
  }, [allTasks, questionLogs, examResults]);

  // Ay sonuna kadar kalan günleri hesapla
  const getDaysUntilMonthEnd = useCallback(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const timeDiff = lastDayOfMonth.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  }, []);

  // Ayın başından seçilen tarihe kadar tüm etkinlikleri al
  const getMonthlyActivities = useCallback((endDate: Date) => {
    const startOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    const activities = {
      tasks: [] as Task[],
      questionLogs: [] as QuestionLog[],
      examResults: [] as ExamResult[],
      total: 0
    };

    // Ayın başından seçilen tarihe kadar her günü döngü ile geç
    const currentDate = new Date(startOfMonth);
    while (currentDate <= endDate) {
      const dayActivities = getActivitiesForDate(new Date(currentDate));
      activities.tasks.push(...dayActivities.tasks);
      activities.questionLogs.push(...dayActivities.questionLogs);
      activities.examResults.push(...dayActivities.examResults);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    activities.total = activities.tasks.length + activities.questionLogs.length + activities.examResults.length;
    return activities;
  }, [getActivitiesForDate]);

  const handleDateClick = (date: Date) => {
    // Düzeltme: Zaman dilimi sorunları olmadan gerçek tarihi kullanın.
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setSelectedDate(dateStr);
  };

  const handleSendEmail = () => {
    // Rapor için mevcut ay etkinliklerini al
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Geçerli ayın verilerini filtrele (kenar çubuğu uygulamasıyla aynı)
    const monthlyTasks = allTasks.filter(task => {
      if (task.completedAt) {
        const completedDate = new Date(task.completedAt);
        return completedDate >= startOfMonth && completedDate <= endOfMonth;
      }
      return false;
    });

    const monthlyQuestionLogs = questionLogs.filter((log: any) => {
      if (log.study_date) {
        const logDate = new Date(log.study_date);
        return logDate >= startOfMonth && logDate <= endOfMonth;
      }
      return false;
    });

    const monthlyExamResults = examResults.filter((exam: any) => {
      if (exam.exam_date) {
        const examDate = new Date(exam.exam_date);
        return examDate >= startOfMonth && examDate <= endOfMonth;
      }
      return false;
    });

    // Calculate comprehensive statistics
    const totalQuestions = monthlyQuestionLogs.reduce((sum: number, log: any) => 
      sum + parseInt(log.correct_count || '0') + parseInt(log.wrong_count || '0') + parseInt(log.blank_count || '0'), 0
    );
    const totalCorrect = monthlyQuestionLogs.reduce((sum: number, log: any) => 
      sum + parseInt(log.correct_count || '0'), 0
    );
    const totalWrong = monthlyQuestionLogs.reduce((sum: number, log: any) => 
      sum + parseInt(log.wrong_count || '0'), 0
    );

    const comprehensiveReportData = {
      totalTasks: monthlyTasks.length,
      totalQuestions: totalQuestions,
      correctAnswers: totalCorrect,
      wrongAnswers: totalWrong,
      totalExams: monthlyExamResults.length,
      totalActivities: monthlyTasks.length + monthlyQuestionLogs.length + monthlyExamResults.length,
      month: currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
      date: currentDate.toLocaleDateString('tr-TR'),
      tasks: monthlyTasks,
      questionLogs: monthlyQuestionLogs,
      examResults: monthlyExamResults,
      user: {
        name: 'Berat Çakıroğlu',
        email: 'beratkaccow03@gmail.com'
      }
    };

    // Send data in format expected by backend: { email, phone, reportData }
    const emailRequest = {
      email: 'beratkaccow03@gmail.com',
      phone: '+90 555 123 45 67', // Optional phone number
      reportData: comprehensiveReportData
    };

    sendEmailMutation.mutate(emailRequest);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header hideClockOnHomepage={true} />
      

      {/* Saatli Ortaya Alınmış Karşılama Bölümü */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <CenteredWelcomeSection />
      </div>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

        {/* Üst Sıra - Takvim ve Bugünün Görevleri Yan Yana */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6 items-stretch">
          {/* Modern Takvim Widget'ı - 3 sütun kaplar (biraz daha büyük) */}
          <div className="lg:col-span-3 bg-gradient-to-br from-card to-card/80 rounded-2xl border border-border/50 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent flex items-center">
                <Calendar className="h-5 w-5 mr-3 text-primary" />
                Takvim
              </h3>
              
              {/* Rapor Gönder Düğmesi - Vurgulanan alana taşındı */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (reportActivated) {
                      setShowReportModal(true);
                    }
                  }}
                  className="relative bg-purple-500/15 hover:bg-purple-500/25 backdrop-blur-sm border-2 border-purple-500/40 hover:border-purple-400/60 text-purple-400 hover:text-purple-300 font-semibold px-4 py-3 rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex flex-col items-center space-y-1 group"
                  data-testid="button-report-send"
                  style={{
                    boxShadow: reportActivated 
                      ? '0 0 20px rgba(147, 51, 234, 0.4), 0 0 40px rgba(147, 51, 234, 0.1)' 
                      : '0 0 15px rgba(147, 51, 234, 0.3)'
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-bold">Rapor Gönder</span>
                    <Send className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                  
                  {/* Düğmedeki Geri Sayım Sayacı */}
                  <div className="text-xs text-purple-800 dark:text-purple-200 font-bold font-mono">
                    {timeUntilMonthEnd.days}g:{timeUntilMonthEnd.hours.toString().padStart(2, '0')}s:{timeUntilMonthEnd.minutes.toString().padStart(2, '0')}d:{timeUntilMonthEnd.seconds.toString().padStart(2, '0')}sn
                  </div>
                  
                  {/* Kırmızı/Yeşil Aktivasyon Çemberi */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setReportActivated(!reportActivated);
                      if (!reportActivated) {
                        toast({
                          title: "✅ Rapor Aktif!",
                          description: "Artık rapor gönderebilirsiniz.",
                          duration: 3000,
                        });
                      }
                    }}
                    className={`absolute -top-1 -right-1 w-4 h-4 rounded-full transition-all duration-300 transform cursor-pointer ${
                      reportActivated 
                        ? 'bg-green-500 shadow-lg shadow-green-500/50 scale-110' 
                        : 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse hover:scale-110'
                    }`}
                    data-testid="button-report-activate"
                  />
                </button>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm font-medium text-muted-foreground px-3 py-1 bg-muted/50 rounded-full min-w-[140px] text-center">
                    {new Date(displayYear, displayMonth).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Modern Takvim Izgara */}
            <div className="space-y-2">
              {/* Hafta Başlıkları */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground/70 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Takvim Günleri */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, index) => {
                  const isCurrentMonth = date.getMonth() === displayMonth;
                  const isToday = date.getDate() === today && isCurrentMonth && displayYear === currentYear && displayMonth === currentMonth;
                  const year = date.getFullYear();
                  const month_num = (date.getMonth() + 1).toString().padStart(2, '0');
                  const day = date.getDate().toString().padStart(2, '0');
                  const dateStr = `${year}-${month_num}-${day}`;
                  const isSelected = selectedDate === dateStr;
                  const dayHasActivities = hasActivities(date);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(date)}
                      className={`relative aspect-square flex flex-col items-center justify-center text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-105 ${
                        isToday
                          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                          : isSelected
                          ? "bg-gradient-to-br from-accent to-accent/80 text-accent-foreground ring-2 ring-primary/50 shadow-md"
                          : isCurrentMonth
                          ? "hover:bg-gradient-to-br hover:from-secondary hover:to-secondary/80 cursor-pointer text-foreground hover:shadow-md border border-transparent hover:border-border/50"
                          : "text-muted-foreground/30 cursor-pointer hover:text-muted-foreground/50"
                      }`}
                      data-testid={`calendar-day-${date.getDate()}`}
                    >
                      <span>{date.getDate()}</span>
                      {dayHasActivities && isCurrentMonth && (
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-0.5"></div>
                      )}
                      {isToday && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>


            {/* Gelişmiş Etkileşimli Takvim Rapor Paneli */}
            {selectedDate && (
              <div className="mt-6 space-y-4">
                {/* Ana Tarih Bilgisi Kartı */}
                <div className="p-5 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg text-foreground flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-2 animate-pulse"></div>
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric',
                        weekday: 'long'
                      })}
                    </h4>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {calendarData?.daysRemaining && calendarData.daysRemaining > 0 
                        ? `${calendarData.daysRemaining} gün sonra` 
                        : calendarData?.daysRemaining === 0 
                        ? "Bugün" 
                        : `${Math.abs(calendarData?.daysRemaining || 0)} gün önce`}
                    </span>
                  </div>
                  
                  {(() => {
                    const selectedDateObj = new Date(selectedDate + 'T12:00:00');
                    const today = new Date();
                    const isPastDate = selectedDateObj < today;
                    const activities = getActivitiesForDate(selectedDateObj);
                    
                    if (isPastDate) {
                      // Gelişmiş Geçmiş Tarih Raporu
                      if (activities.total === 0) {
                        return (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Bu gün hiç aktivite yapılmamış
                            </p>
                            <p className="text-xs text-muted-foreground/70">
                              Gelecekte daha aktif olmaya çalışalım! 💪
                            </p>
                          </div>
                        );
                      } else {
                        const taskProgress = activities.tasks.length;
                        const questionProgress = activities.questionLogs.length;
                        const examProgress = activities.examResults.length;
                        
                        return (
                          <div className="space-y-4">
                            {/* Etkinlik Özeti Kartları */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{taskProgress}</div>
                                <div className="text-xs text-green-700 dark:text-green-300">Görev</div>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{questionProgress}</div>
                                <div className="text-xs text-blue-700 dark:text-blue-300">Soru</div>
                              </div>
                              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{examProgress}</div>
                                <div className="text-xs text-purple-700 dark:text-purple-300">Deneme</div>
                              </div>
                            </div>

                            {/* Toplam Aktivite İlerlemesi */}
                            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-foreground">Günlük Performans</span>
                                <span className="text-lg font-bold text-primary">{activities.total}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min((activities.total / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {activities.total >= 10 ? "Müthiş bir gün! 🎉" : activities.total >= 5 ? "İyi gidiyor! 👍" : "Daha fazla çalışabiliriz! 💪"}
                              </div>
                            </div>

                            {/* Detaylı Aktivite Listesi */}
                            <div className="space-y-2">
                              <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center">
                                <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                                Aktivite Detayları
                              </h5>
                              
                              {/* Filter Buttons */}
                              <div className="flex gap-2 mb-3">
                                <button 
                                  onClick={() => setActivityFilter('all')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'all' 
                                      ? 'bg-primary text-white shadow-sm' 
                                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                  }`}
                                  data-testid="button-filter-all"
                                >
                                  Tümü
                                </button>
                                <button 
                                  onClick={() => setActivityFilter('tasks')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'tasks' 
                                      ? 'bg-green-500 text-white shadow-sm' 
                                      : 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30 text-green-700 dark:text-green-300'
                                  }`}
                                  data-testid="button-filter-tasks"
                                >
                                  Görev
                                </button>
                                <button 
                                  onClick={() => setActivityFilter('questions')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'questions' 
                                      ? 'bg-blue-500 text-white shadow-sm' 
                                      : 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                  }`}
                                  data-testid="button-filter-questions"
                                >
                                  Soru
                                </button>
                                <button 
                                  onClick={() => setActivityFilter('exams')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'exams' 
                                      ? 'bg-purple-500 text-white shadow-sm' 
                                      : 'bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300'
                                  }`}
                                  data-testid="button-filter-exams"
                                >
                                  Deneme
                                </button>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {/* Tamamlanan görevleri göster */}
                                {(activityFilter === 'all' || activityFilter === 'tasks') && activities.tasks.map((task: Task) => (
                                  <div key={task.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/10 rounded-lg">
                                    <div className="flex items-center text-sm">
                                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                      <span className="font-medium">Görev:</span>
                                      <span className="ml-2 text-muted-foreground">{task.title}</span>
                                    </div>
                                    <div className="text-xs text-green-600 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                      ✓ Tamamlandı
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Soru günlüklerini göster */}
                                {(activityFilter === 'all' || activityFilter === 'questions') && activities.questionLogs.map((log: QuestionLog) => (
                                  <div key={log.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/10 rounded-lg">
                                    <div className="flex items-center text-sm">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                      <span className="font-medium">Soru:</span>
                                      <span className="ml-2 text-muted-foreground">{log.exam_type} {log.subject}</span>
                                    </div>
                                    <div className="text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                                      {log.correct_count} doğru
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Sınav sonuçlarını göster */}
                                {(activityFilter === 'all' || activityFilter === 'exams') && activities.examResults.map((exam: ExamResult) => (
                                  <div key={exam.id} className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950/10 rounded-lg">
                                    <div className="flex items-center text-sm">
                                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                                      <span className="font-medium">Deneme:</span>
                                      <span className="ml-2 text-muted-foreground">{exam.exam_name}</span>
                                    </div>
                                    <div className="text-xs text-purple-600 bg-purple-100 dark:bg-purple-900/20 px-2 py-1 rounded-full">
                                      TYT: {exam.tyt_net} | AYT: {exam.ayt_net}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    } else {
                      // Geliştirilmiş Gelecek Tarih Planlaması
                      return (
                        <div className="space-y-4">
                          {/* Planlama Özeti */}
                          <div className="bg-gradient-to-r from-accent/5 to-accent/10 rounded-lg p-4 border border-accent/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">Planlanan Aktiviteler</span>
                              <span className="text-lg font-bold text-accent">{calendarData?.tasksCount || 0}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(calendarData?.tasksCount || 0) === 0 
                                ? "Henüz bu güne özel görev planlanmamış" 
                                : `${calendarData?.tasksCount || 0} görev bu güne planlandı`}
                            </div>
                          </div>

                          {/* Planlanan Görevler */}
                          {calendarData?.tasks && calendarData.tasks.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center">
                                <div className="w-2 h-2 bg-accent rounded-full mr-2"></div>
                                Planlanan Görevler
                              </h5>
                              {calendarData.tasks.slice(0, 3).map((task: Task) => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-accent/5 rounded-lg border border-accent/10">
                                  <div className="flex items-center text-sm">
                                    <div className="w-2 h-2 bg-accent/60 rounded-full mr-3"></div>
                                    <span className="font-medium text-foreground">{task.title}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded-full">
                                      {task.priority === 'high' ? '🔴 Yüksek' : task.priority === 'medium' ? '🟡 Orta' : '🟢 Düşük'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {getCategoryText(task.category)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {calendarData.tasks.length > 3 && (
                                <div className="text-center">
                                  <button className="text-xs font-medium text-accent hover:text-accent/80 bg-accent/10 hover:bg-accent/20 px-4 py-2 rounded-lg transition-colors duration-200">
                                    {calendarData.tasks.length - 3} görev daha göster
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    }
                  })()
                  }
                </div>
              </div>
            )}
          </div>

          {/* Bugünün Görevleri Kolonu - 2 sütun alır */}
          <div className="lg:col-span-2 h-full">
            <TodaysTasksWidget />
          </div>
        </div>

        {/* Orta Satır - Hava Durumu Widget'ı (Tam Genişlik) */}
        <div className="mb-8">
          <EnhancedWeatherWidget />
        </div>


        {/* Geri Sayım Bölümü - Aşağı Taşındı */}
        <div className="mb-8">
          <CountdownWidget className="p-5 md:p-6" />
        </div>
      </main>

      {/* Gelişmiş Rapor Modalı */}
      <Dialog open={showReportModal && reportActivated} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent flex items-center">
              <FileText className="h-6 w-6 mr-3 text-purple-600" />
              Aylık Aktivite Raporu
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} ayı başından bugüne kadar yapılan tüm aktiviteler
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {(() => {
              const currentDate = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
              const monthlyActivities = getMonthlyActivities(currentDate);
              
              return (
                <>
                  {/* Kompakt Etkinlik Özeti Kartları */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {monthlyActivities.tasks.length}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 font-medium">Tamamlanan Görev</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {monthlyActivities.questionLogs.length}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Çözülen Soru</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {monthlyActivities.examResults.length}
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">Yapılan Deneme</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {monthlyActivities.total}
                      </div>
                      <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">Toplam Aktivite</div>
                    </div>
                  </div>


                  {/* E-posta Bölümü */}
                  <div className="border-t border-border pt-6">
                    <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-4 border border-border/30">
                      <div className="flex items-center mb-4">
                        <Mail className="h-5 w-5 text-purple-600 mr-2" />
                        <span className="font-semibold text-foreground">Rapor Gönderimi</span>
                      </div>
                      
                      <div className="space-y-4">
                        {/* E-posta Adresi - Güvenli Şekilde Yapılandırıldı */}
                        <div>
                          <Label htmlFor="email-address" className="text-sm font-medium text-muted-foreground mb-1 block">
                            Gönderilecek Adres
                          </Label>
                          <div className="relative">
                            <Input
                              id="email-address"
                              type="email"
                              value="Güvenli şekilde yapılandırılmış"
                              disabled
                              className="bg-muted/50 text-muted-foreground cursor-not-allowed pr-12"
                              data-testid="input-email-configured"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="w-4 h-4 text-green-500">✓</div>
                            </div>
                          </div>
                        </div>

                        {/* Bilgi Mesajı */}
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 text-purple-600 dark:text-purple-400">📊</div>
                            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                              Aylık Aktivite raporum gmailime burdan gönderilecek.
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-6">
                        <Button
                          onClick={handleSendEmail}
                          disabled={sendEmailMutation.isPending}
                          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50"
                          data-testid="button-send-report"
                        >
                          {sendEmailMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                              Gönderiliyor...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Raporu Gönder
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* copyright beroooş */}
      <footer className="bg-muted/30 border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Berat Çakıroğlu. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
}
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
