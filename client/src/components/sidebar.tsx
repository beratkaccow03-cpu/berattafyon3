//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  
  // Get additional data needed for report
  const { data: questionLogs = [] } = useQuery({
    queryKey: ["/api/question-logs"],
  });
  
  const { data: examResults = [] } = useQuery({
    queryKey: ["/api/exam-results"],
  });

  // Real-time clock state
  const [currentTime, setCurrentTime] = React.useState(new Date());
  
  // Report sending state
  const [isSending, setIsSending] = React.useState(false);

  // Update time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const turkçeTasks = tasks.filter(task => task.category === "turkce").length;
  const matematikTasks = tasks.filter(task => task.category === "matematik").length;
  const genelTasks = tasks.filter(task => task.category === "genel").length;

  // Zaman dilimi sorunlarını önlemek ve performansı artırmak için yerel tarihleri kullanarak özet ön hesaplama etkinlik haritasını geliştir, İstatistikler - 2x2 Izgara Düzeni
  const activityMap = React.useMemo(() => {
    const map = new Map<string, { hasCreated: boolean; hasCompleted: boolean }>();
    
    tasks.forEach(task => {
      // Yerel tarih biçimini kullanarak görev oluşturma tarihini işleyin
      if (task.createdAt) {
        const createdDate = new Date(task.createdAt).toLocaleDateString('en-CA'); // YYYY-AA-GG format
        const existing = map.get(createdDate) || { hasCreated: false, hasCompleted: false };
        map.set(createdDate, { ...existing, hasCreated: true });
      }
      
      // Yerel tarih biçimini kullanarak görev tamamlama tarihini işleyin
      if (task.completed && task.completedAt) {
        const completedDate = new Date(task.completedAt).toLocaleDateString('en-CA'); // YYYY-AA-GG format
        const existing = map.get(completedDate) || { hasCreated: false, hasCompleted: false };
        map.set(completedDate, { ...existing, hasCompleted: true });
      }
    });
    
    return map;
  }, [tasks]);

  // Bir tarih için etkinlik türünü alma işlevi (O(1) arama)
  const getActivityType = (date: Date): 'created' | 'completed' | 'both' | 'none' => {
    const dateStr = date.toLocaleDateString('en-CA'); // YYYY-AA-GG format local
    const activity = activityMap.get(dateStr);
    
    if (!activity) return 'none';
    if (activity.hasCreated && activity.hasCompleted) return 'both';
    if (activity.hasCompleted) return 'completed';
    if (activity.hasCreated) return 'created';
    return 'none';
  };

  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  const currentMonth = currentDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  const currentWeekday = currentDate.toLocaleDateString("tr-TR", { weekday: "long" });

  // Geçerli ay için takvim günleri oluştur
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const calendarDays = [];
  for (let i = 0; i < 35; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    calendarDays.push(date);
  }

  return (
    <div className="space-y-6">
      {/* Hızlı İstatistikler */}
      <div className="bg-card rounded-lg border border-border p-6 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-foreground mb-4">Dashboard</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Toplam Görev</span>
            <span className="font-semibold text-foreground" data-testid="text-total-tasks">{totalTasks}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Tamamlanan</span>
            <span className="font-semibold text-green-600" data-testid="text-completed-tasks">{completedTasks}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Bekleyen</span>
            <span className="font-semibold text-orange-600" data-testid="text-pending-tasks">{pendingTasks}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground">%{completionPercentage} tamamlandı</p>
        </div>
      </div>

      {/* Takvim Widget'ı */}
      <div className="bg-card rounded-lg border border-border p-6 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-foreground mb-4">Takvim</h3>
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-foreground" data-testid="text-current-day">{currentDay}</div>
          <div className="text-sm text-muted-foreground" data-testid="text-current-date">{currentMonth}</div>
          <div className="text-xs text-muted-foreground" data-testid="text-current-weekday">{currentWeekday}</div>
        </div>
        
        {/* Saat Göstergesi - Saat Simgesi ile Ortalanmış */}
        <div className="flex items-center justify-center gap-2 mb-4 p-3 border border-border rounded-lg bg-secondary/30" data-testid="clock-display">
          <Clock className="w-5 h-5 text-primary" />
          <div className="text-lg font-mono font-semibold text-foreground" data-testid="text-current-time">
            {currentTime.toLocaleTimeString('tr-TR', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: false 
            })}
          </div>
        </div>

        {/* Mini Takvim Izgarası */}
        <div className="grid grid-cols-7 gap-1 text-xs">
          <div className="text-center text-muted-foreground p-1">P</div>
          <div className="text-center text-muted-foreground p-1">S</div>
          <div className="text-center text-muted-foreground p-1">Ç</div>
          <div className="text-center text-muted-foreground p-1">P</div>
          <div className="text-center text-muted-foreground p-1">C</div>
          <div className="text-center text-muted-foreground p-1">C</div>
          <div className="text-center text-muted-foreground p-1">P</div>
          {calendarDays.slice(0, 28).map((date, index) => {
            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.getDate() === currentDay && isCurrentMonth;
            const activityType = getActivityType(date);
            
            return (
              <div
                key={index}
                className={`text-center p-1 relative ${
                  isToday
                    ? "bg-primary text-primary-foreground rounded"
                    : isCurrentMonth
                    ? "hover:bg-secondary rounded cursor-pointer"
                    : "text-muted-foreground/50"
                }`}
              >
                {date.getDate()}
                {activityType !== 'none' && isCurrentMonth && !isToday && (
                  <div className="absolute top-0 right-0 flex flex-col gap-0.5">
                    {activityType === 'created' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Görev eklendi"></div>
                    )}
                    {activityType === 'completed' && (
                      <div className="w-2 h-2 bg-purple-500 rounded-full" title="Görev tamamlandı"></div>
                    )}
                    {activityType === 'both' && (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Görev eklendi"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full" title="Görev tamamlandı"></div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Rapor Gönder Düğmesi */}
        {/* GELİŞTİRİLECEK UNUTMA */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-2">
              Ay Sonuna Kalan Süre: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()} gün
            </div>
            <Button
              onClick={async () => {
                if (isSending) return;
                
                setIsSending(true);
                
                try {
                  // Yedeklemeli dizilerim olduğundan emin ol
                  const safeTasks = Array.isArray(tasks) ? tasks : [];
                  const safeQuestionLogs = Array.isArray(questionLogs) ? questionLogs : [];
                  const safeExamResults = Array.isArray(examResults) ? examResults : [];
                  
                  // Aylık aktiviteleri hesapla
                  const currentMonth = new Date();
                  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                  
                  // Bu ayın verilerini filtrele
                  const monthlyTasks = safeTasks.filter(task => {
                    if (task.completedAt) {
                      const completedDate = new Date(task.completedAt);
                      return completedDate >= startOfMonth && completedDate <= endOfMonth;
                    }
                    return false;
                  });

                  const monthlyQuestionLogs = safeQuestionLogs.filter((log: any) => {
                    if (log.study_date) {
                      const logDate = new Date(log.study_date);
                      return logDate >= startOfMonth && logDate <= endOfMonth;
                    }
                    return false;
                  });

                  const monthlyExamResults = safeExamResults.filter((exam: any) => {
                    if (exam.exam_date) {
                      const examDate = new Date(exam.exam_date);
                      return examDate >= startOfMonth && examDate <= endOfMonth;
                    }
                    return false;
                  });

                  const monthlyActivities = {
                    tasks: monthlyTasks,
                    questionLogs: monthlyQuestionLogs,
                    examResults: monthlyExamResults,
                    total: monthlyTasks.length + monthlyQuestionLogs.length + monthlyExamResults.length
                  };

                  const reportData = {
                    month: new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
                    date: new Date().toLocaleDateString('tr-TR'),
                    activities: monthlyActivities,
                    email: 'brtbllcankir03@gmail.com' //gönderilecek özel eposta buraya
                  };

                  // Raporu gönder
                  const response = await fetch('/api/send-report', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(reportData),
                  });

                  if (response.ok) {
                    const result = await response.json();
                    alert('📧 ' + result.message);
                  } else {
                    const errorData = await response.json().catch(() => ({ message: 'Bilinmeyen hata oluştu' }));
                    alert('❌ Rapor gönderilirken hata oluştu: ' + errorData.message);
                  }
                } catch (error) {
                  console.error('Report sending error:', error);
                  alert('❌ Rapor gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
                } finally {
                  setIsSending(false);
                }
              }}
              disabled={isSending}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-sidebar-report-send"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Rapor Gönder
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Kategoriler */}
      <div className="bg-card rounded-lg border border-border p-6 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-foreground mb-4">Kategoriler</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-foreground">Türkçe</span>
            </div>
            <span className="text-xs text-muted-foreground" data-testid="text-turkce-tasks">{turkçeTasks}</span>
          </div>
          <div className="flex items-center justify-between p-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-foreground">Matematik</span>
            </div>
            <span className="text-xs text-muted-foreground" data-testid="text-matematik-tasks">{matematikTasks}</span>
          </div>
          <div className="flex items-center justify-between p-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-foreground">Genel</span>
            </div>
            <span className="text-xs text-muted-foreground" data-testid="text-genel-tasks">{genelTasks}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
