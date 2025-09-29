//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { CheckCircle2, Circle, Plus, Calendar, PartyPopper } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export function TodaysTasksWidget() {
  const { toast } = useToast();
  const [celebratingTask, setCelebratingTask] = useState<string | null>(null);
  const [showCompletionBar, setShowCompletionBar] = useState(false);
  
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
  
  // Bugünün tarihini YYYY-AA-BB biçiminde al (TR ayarlarına uygun)
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  const { data: todaysData, isLoading } = useQuery<{
    date: string;
    dayNumber: number;
    daysRemaining: number;
    tasks: Task[];
    tasksCount: number;
  }>({
    queryKey: ["/api/calendar", todayStr],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/${todayStr}`);
      if (!response.ok) throw new Error('Failed to fetch today\'s tasks');
      return response.json();
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (taskId: string) => 
      apiRequest("PATCH", `/api/tasks/${taskId}/toggle`),
    onSuccess: (_, taskId) => {
      // Görev tamamlandı mı kontrol et
      const task = tasks.find(t => t.id === taskId);
      const wasCompleted = task?.completed;
      
      queryClient.invalidateQueries({ queryKey: ["/api/calendar", todayStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      // Eğer görev şimdi tamamlandıysa celebration göster
      if (!wasCompleted) {
        setCelebratingTask(taskId);
        setShowCompletionBar(true);
        
        toast({
          title: "🎉 Tebrikler!",
          description: "Görev başarıyla tamamlandı!",
        });

        // 3 saniye sonra celebration'ı kaldır
        setTimeout(() => {
          setCelebratingTask(null);
          setShowCompletionBar(false);
        }, 3000);
      } else {
        toast({
          title: "Görev güncellendi",
          description: "Görev durumu başarıyla değiştirildi.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Görev durumu değiştirilemedi.",
        variant: "destructive",
      });
    },
  });

  const tasks = todaysData?.tasks || [];
  const completedCount = tasks.filter(task => task.completed).length;
  const totalCount = tasks.length;

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 transition-colors duration-300 h-full">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary" />
          Bugün Yapılacaklar
        </h3>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded mb-2"></div>
          <div className="h-3 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 transition-colors duration-300 h-full flex flex-col relative overflow-hidden">
      {/* Completion Bar - Görev tamamlandığında gösterilir */}
      {showCompletionBar && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 h-2 z-10 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-ping"></div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary" />
          Bugün Yapılacaklar
        </h3>
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-full px-3 py-1" data-testid="text-today-counts">
          {completedCount}/{totalCount}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Bugün hiç aktivite tamamlanmamış !</p>
          <p className="text-xs mt-1">Bugün için planlanan görevler henüz yok</p>
        </div>
      ) : (
        <>
          {/* İlerleme çubuğu */}
          <div className="w-full bg-secondary rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            ></div>
          </div>

          {/* Görev Listesi - Kutunun en altına kadar uzar */}
          <div className={`space-y-3 flex-1 min-h-0 ${tasks.length > 7 ? 'overflow-y-auto' : 'overflow-hidden'} custom-scrollbar max-h-96`}>
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 hover:bg-muted/50 relative ${
                  celebratingTask === task.id 
                    ? 'bg-gradient-to-r from-green-100/80 to-emerald-100/80 dark:from-green-900/40 dark:to-emerald-900/40 border-green-300 dark:border-green-600 scale-105 shadow-lg' 
                    : task.completed 
                    ? 'bg-muted/30 border-muted' 
                    : 'bg-background border-border/50 hover:border-border'
                }`}
                style={{
                  borderLeft: `4px solid ${task.color || '#8B5CF6'}`,
                }}
                data-testid={`list-task-${task.id}`}
              >
                {/* Celebration efekti - Enhanced */}
                {celebratingTask === task.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/30 to-emerald-400/30 animate-pulse rounded-lg pointer-events-none">
                    <div className="absolute top-2 right-2 animate-bounce">
                      <PartyPopper className="h-5 w-5 text-green-600 drop-shadow-lg" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-ping"></div>
                  </div>
                )}
                <button
                  onClick={() => toggleTaskMutation.mutate(task.id)}
                  className={`flex-shrink-0 transition-all duration-300 transform hover:scale-110 ${
                    task.completed 
                      ? 'text-green-600 hover:text-green-500 drop-shadow-md' 
                      : 'text-muted-foreground hover:text-primary hover:drop-shadow-md'
                  }`}
                  disabled={toggleTaskMutation.isPending}
                  data-testid={`button-toggle-task-${task.id}`}
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 animate-in fade-in-0 zoom-in-95 duration-200" />
                  ) : (
                    <Circle className="h-5 w-5 hover:animate-pulse" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm transition-all duration-200 ${
                    task.completed 
                      ? 'line-through text-muted-foreground' 
                      : 'text-foreground'
                  }`}>
                    {task.title}
                  </div>
                  
                  {task.description && (
                    <div className={`text-xs mt-1 transition-all duration-200 ${
                      task.completed 
                        ? 'line-through text-muted-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {task.description.length > 80 
                        ? `${task.description.substring(0, 80)}...` 
                        : task.description}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.priority === 'high' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : task.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {task.priority === 'high' ? 'Yüksek' : task.priority === 'medium' ? 'Orta' : 'Düşük'}
                    </span>
                    
                    <span className="text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
                      {getCategoryText(task.category)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Özet */}
          {tasks.length > 0 && (
            <div className="mt-auto pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground text-center">
                {completedCount === totalCount 
                  ? "🎉 Tüm günlük görevler tamamlandı!" 
                  : `${totalCount - completedCount} görev kaldı`
                }
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
