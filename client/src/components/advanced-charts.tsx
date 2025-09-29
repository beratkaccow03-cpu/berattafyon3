//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, Target, Brain, AlertTriangle, BarChart3, Book, Calculator, Atom, FlaskConical, Dna, User, Calendar, TrendingDown, Check, CheckCircle } from "lucide-react";
import { ExamResult, QuestionLog } from "@shared/schema";
import { useMemo, useState, memo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface MissingTopic {
  topic: string;
  subject: string;
  source: 'exam' | 'question';
  frequency: number;
  lastSeen: string;
  difficulty?: string;
  category?: string;
}

interface ExamNetData {
  date: string;
  examName: string;
  tytNet: number;
  aytNet: number;
  tytTarget: number;
  aytTarget: number;
}

interface SubjectAnalysisData {
  subject: string;
  correct: number;
  wrong: number;
  totalQuestions: number;
  netScore: number;
  color: string;
}

function AdvancedChartsComponent() {
  const [analysisMode, setAnalysisMode] = useState<'net' | 'subject'>('net');
  const [completedTopics, setCompletedTopics] = useState<Set<string>>(new Set());
  const [celebratingTopics, setCelebratingTopics] = useState<Set<string>>(new Set());
  const [completedErrorTopics, setCompletedErrorTopics] = useState<Set<string>>(new Set());
  const [celebratingErrorTopics, setCelebratingErrorTopics] = useState<Set<string>>(new Set());
  const [removedTopics, setRemovedTopics] = useState<Set<string>>(new Set());
  const [removedErrorTopics, setRemovedErrorTopics] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // localStorage'dan state'leri yükle
  useEffect(() => {
    try {
      const savedRemovedTopics = localStorage.getItem('removedTopics');
      const savedRemovedErrorTopics = localStorage.getItem('removedErrorTopics');
      const savedCompletedTopics = localStorage.getItem('completedTopics');
      const savedCompletedErrorTopics = localStorage.getItem('completedErrorTopics');
      
      if (savedRemovedTopics) {
        setRemovedTopics(new Set(JSON.parse(savedRemovedTopics)));
      }
      if (savedRemovedErrorTopics) {
        setRemovedErrorTopics(new Set(JSON.parse(savedRemovedErrorTopics)));
      }
      if (savedCompletedTopics) {
        setCompletedTopics(new Set(JSON.parse(savedCompletedTopics)));
      }
      if (savedCompletedErrorTopics) {
        setCompletedErrorTopics(new Set(JSON.parse(savedCompletedErrorTopics)));
      }
    } catch (error) {
      console.error('Error loading state from localStorage:', error);
    }
  }, []);

  // localStorage'a state'leri kaydet
  useEffect(() => {
    try {
      localStorage.setItem('removedTopics', JSON.stringify(Array.from(removedTopics)));
    } catch (error) {
      console.error('Error saving removedTopics to localStorage:', error);
    }
  }, [removedTopics]);

  useEffect(() => {
    try {
      localStorage.setItem('removedErrorTopics', JSON.stringify(Array.from(removedErrorTopics)));
    } catch (error) {
      console.error('Error saving removedErrorTopics to localStorage:', error);
    }
  }, [removedErrorTopics]);

  useEffect(() => {
    try {
      localStorage.setItem('completedTopics', JSON.stringify(Array.from(completedTopics)));
    } catch (error) {
      console.error('Error saving completedTopics to localStorage:', error);
    }
  }, [completedTopics]);

  useEffect(() => {
    try {
      localStorage.setItem('completedErrorTopics', JSON.stringify(Array.from(completedErrorTopics)));
    } catch (error) {
      console.error('Error saving completedErrorTopics to localStorage:', error);
    }
  }, [completedErrorTopics]);

  // Konu isimlerinden TYT/AYT ve konu başlıklarını kaldırmak için yardımcı işlev.
  const normalizeTopic = (topic: string): string => {
    // "TYT Türkçe - " veya "AYT Fizik - " gibi desenleri konu isimlerinden kaldırır
    return topic.replace(/^(TYT|AYT)\s+[^-]+\s*-\s*/, '').trim();
  };

  const { data: examResults = [], isLoading: isLoadingExams } = useQuery<ExamResult[]>({
    queryKey: ["/api/exam-results"],
  });
  
  const { data: questionLogs = [], isLoading: isLoadingQuestions } = useQuery<QuestionLog[]>({
    queryKey: ["/api/question-logs"],
  });

  const isLoading = isLoadingExams || isLoadingQuestions;

  // Konu bazında eksik konuları toplar
  const missingTopics = useMemo(() => {
    const topicMap = new Map<string, MissingTopic>();

    // Soru günlüklerini işleyin
    questionLogs.forEach(log => {
      if (log.wrong_topics && log.wrong_topics.length > 0) {
        log.wrong_topics.forEach(topicItem => {
          // Hem string[] hem de object[] formatlarını işleyin
          const rawTopic = typeof topicItem === 'string' ? topicItem : (topicItem as any)?.topic;
          if (rawTopic) {
            //  "TYT Türkçe - " veya "AYT Fizik - " gibi desenleri konu isimlerinden kaldırma
            const topic = normalizeTopic(rawTopic);
            // TYT/AYT bilgisini de konuya ekle
            const subjectWithExamType = `${log.exam_type} ${log.subject}`;
            const key = `${subjectWithExamType}-${topic}`;
            if (topicMap.has(key)) {
              const existing = topicMap.get(key)!;
              existing.frequency += 1;
              existing.lastSeen = log.study_date > existing.lastSeen ? log.study_date : existing.lastSeen;
            } else {
              topicMap.set(key, {
                topic,
                subject: subjectWithExamType,
                source: 'question',
                frequency: 1,
                lastSeen: log.study_date,
                difficulty: typeof topicItem === 'object' ? (topicItem as any)?.difficulty : undefined,
                category: typeof topicItem === 'object' ? (topicItem as any)?.category : undefined
              });
            }
          }
        });
      }
    });

    // Sınav sonuçlarını işleyin - eksik konuları subjects_data'dan çıkarmamız gerekiyor
    examResults.forEach(exam => {
      if (exam.subjects_data) {
        try {
          const subjectsData = JSON.parse(exam.subjects_data);
          Object.entries(subjectsData).forEach(([subjectKey, data]: [string, any]) => {
            if (data.wrong_topics && data.wrong_topics.length > 0) {
              const subjectNameMap: {[key: string]: string} = {
                'turkce': 'Türkçe',
                'matematik': 'Matematik',
                'sosyal': 'Sosyal',
                'fen': 'Fen',
                'fizik': 'Fizik',
                'kimya': 'Kimya',
                'biyoloji': 'Biyoloji'
              };
              const subjectName = subjectNameMap[subjectKey] || subjectKey;
              // TYT/AYT bilgisini de konuya ekle
              const examType = exam.exam_type || 'TYT';
              const subjectWithExamType = `${examType} ${subjectName}`;
              
              data.wrong_topics.forEach((rawTopic: string) => {
                //  "TYT Türkçe - " veya "AYT Fizik - " gibi desenleri konu isimlerinden kaldırma
                const topic = normalizeTopic(rawTopic);
                const key = `${subjectWithExamType}-${topic}`;
                if (topicMap.has(key)) {
                  const existing = topicMap.get(key)!;
                  existing.frequency += 1;
                  existing.lastSeen = exam.exam_date > existing.lastSeen ? exam.exam_date : existing.lastSeen;
                } else {
                  topicMap.set(key, {
                    topic,
                    subject: subjectWithExamType,
                    source: 'exam',
                    frequency: 1,
                    lastSeen: exam.exam_date
                  });
                }
              });
            }
          });
        } catch (e) {
          console.error('Error parsing subjects_data:', e);
        }
      }
    });

    return Array.from(topicMap.values()).sort((a, b) => b.frequency - a.frequency);
  }, [questionLogs, examResults]);

  // Net Analiz Verilerini İşleyin - Uygun olmayan sınav türleri için null göstermesi için düzeltildi
  const netAnalysisData = useMemo(() => {
    return examResults.map(exam => {
      // Sınavın TYT veya AYT olup olmadığını belirleyin
      const examType = exam.exam_type || (parseFloat(exam.ayt_net) > 0 ? 'AYT' : 'TYT');
      
      return {
        date: new Date(exam.exam_date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
        examName: exam.exam_name,
        // Uygun olmayan sınav türleri için null kullanın, böylece sıfır göstermek yerine satırı kırar
        tytNet: examType === 'TYT' ? (parseFloat(exam.tyt_net) || 0) : null,
        aytNet: examType === 'AYT' ? (parseFloat(exam.ayt_net) || 0) : null,
        tytTarget: 90,
        aytTarget: 50,
        sortDate: exam.exam_date
      };
    }).sort((a, b) => new Date(a.sortDate).getTime() - new Date(b.sortDate).getTime());
  }, [examResults]);

  // Konu Analiz Verilerini İşleyin - TYT ve AYT için ayrı
  const { tytSubjectAnalysisData, aytSubjectAnalysisData } = useMemo(() => {
    const tytSubjectMap = new Map<string, { correct: number; wrong: number; total: number }>();
    const aytSubjectMap = new Map<string, { correct: number; wrong: number; total: number }>();

    // Sınav sonuçlarını konu verileri için işleyin, sınav türüne göre ayırın
    examResults.forEach(exam => {
      if (exam.subjects_data) {
        try {
          const subjectsData = JSON.parse(exam.subjects_data);
          Object.entries(subjectsData).forEach(([subjectKey, data]: [string, any]) => {
            const subjectNameMap: {[key: string]: string} = {
              'turkce': 'Türkçe',
              'matematik': 'Matematik', 
              'sosyal': 'Sosyal',
              'fen': 'Fen',
              'fizik': 'Fizik',
              'kimya': 'Kimya',
              'biyoloji': 'Biyoloji'
            };
            const subjectName = subjectNameMap[subjectKey] || subjectKey;
            const correct = parseInt(data.correct) || 0;
            const wrong = parseInt(data.wrong) || 0;
            
            if (correct > 0 || wrong > 0) {
              // Sınav türüne göre uygun haritayı seçin
              const targetMap = exam.exam_type === 'TYT' ? tytSubjectMap : aytSubjectMap;
              
              if (targetMap.has(subjectName)) {
                const existing = targetMap.get(subjectName)!;
                existing.correct += correct;
                existing.wrong += wrong;
                existing.total += (correct + wrong);
              } else {
                targetMap.set(subjectName, {
                  correct,
                  wrong,
                  total: correct + wrong
                });
              }
            }
          });
        } catch (e) {
          console.error('Error parsing subjects_data:', e);
        }
      }
    });

    const subjectColors: {[key: string]: string} = {
      'Türkçe': '#ef4444',
      'Matematik': '#3b82f6', 
      'Sosyal': '#f59e0b',
      'Fen': '#10b981',
      'Fizik': '#8b5cf6',
      'Kimya': '#ec4899',
      'Biyoloji': '#06b6d4'
    };

    const processSubjectData = (subjectMap: Map<string, any>) => {
      return Array.from(subjectMap.entries()).map(([subject, data]) => ({
        subject,
        correct: data.correct,
        wrong: data.wrong,
        totalQuestions: data.total,
        netScore: data.correct - (data.wrong * 0.25),
        color: subjectColors[subject] || '#6b7280',
        correctRate: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        wrongRate: data.total > 0 ? (data.wrong / data.total) * 100 : 0
      }));
    };

    return {
      tytSubjectAnalysisData: processSubjectData(tytSubjectMap),
      aytSubjectAnalysisData: processSubjectData(aytSubjectMap)
    };
  }, [examResults]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg border p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Analiz verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Geliştirilmiş Eksik Konular Bölümü - Daha Büyük ve Daha Modern */}
      <Card className="bg-gradient-to-br from-red-50/70 via-white to-orange-50/60 dark:from-red-950/40 dark:via-slate-800/60 dark:to-orange-950/30 backdrop-blur-lg border-2 border-red-200/40 dark:border-red-800/40 shadow-2xl hover:shadow-3xl transition-all duration-700 group relative overflow-hidden">
        {/* Animasyonlu Arka Plan Elemanları */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-red-500/15 to-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-orange-500/15 to-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-gradient-to-br from-red-400/5 to-orange-400/5 rounded-full blur-2xl"></div>
        
        <CardHeader className="bg-gradient-to-r from-red-500/15 to-orange-500/15 rounded-t-lg border-b border-red-200/40 pb-8 relative">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gradient-to-br from-red-500 via-red-600 to-orange-500 rounded-2xl shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110">
              <AlertTriangle className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                🎯 Eksik Olduğum Konular
              </CardTitle>
              <p className="text-sm text-red-600/70 dark:text-red-400/70 font-medium mt-2">
                Soru çözümü ve deneme sınavlarından toplanan eksik konu analizi
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-8 relative min-h-[400px]">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-full mb-6 shadow-lg">
                <div className="animate-spin w-10 h-10 border-4 border-red-200 border-t-red-500 rounded-full"></div>
              </div>
              <h4 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-3">Eksik konular analiz ediliyor...</h4>
              <div className="flex justify-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-bounce"></div>
                <div className="w-3 h-3 rounded-full bg-orange-500 animate-bounce delay-100"></div>
                <div className="w-3 h-3 rounded-full bg-red-600 animate-bounce delay-200"></div>
              </div>
            </div>
          ) : missingTopics.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Target className="h-12 w-12 text-green-500" />
              </div>
              <h4 className="text-2xl font-semibold text-green-700 dark:text-green-300 mb-3">Harika! Henüz eksik konu yok</h4>
              <p className="text-base opacity-75">Soru çözümü ve deneme sınavı ekledikçe eksik konular burada görünecek</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {missingTopics.slice(0, 15).filter(topic => !removedTopics.has(`${topic.subject}-${topic.topic}`)).map((topic, index) => (
                <div key={index} className={`bg-white/70 dark:bg-gray-900/70 rounded-2xl p-6 border border-red-200/50 dark:border-red-700/50 hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm relative overflow-hidden group/card ${
                  celebratingTopics.has(`${topic.subject}-${topic.topic}`) ? 'animate-pulse bg-green-100/80 dark:bg-green-900/40 border-green-300 dark:border-green-600' : ''
                } ${
                  completedTopics.has(`${topic.subject}-${topic.topic}`) && !celebratingTopics.has(`${topic.subject}-${topic.topic}`) ? 'opacity-50 transform scale-95' : ''
                }`}>
                  <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-300 ${
                    celebratingTopics.has(`${topic.subject}-${topic.topic}`) 
                      ? 'bg-gradient-to-br from-green-200/60 to-emerald-200/40 dark:from-green-800/40 dark:to-emerald-800/30 opacity-100' 
                      : 'from-red-50/50 to-orange-50/30 dark:from-red-950/20 dark:to-orange-950/10 opacity-0 group-hover/card:opacity-100'
                  }`}></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-bold text-red-700 dark:text-red-300">{topic.subject}</span>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={completedTopics.has(`${topic.subject}-${topic.topic}`)}
                          onCheckedChange={(checked) => {
                            const topicKey = `${topic.subject}-${topic.topic}`;
                            if (checked) {
                              setCompletedTopics(prev => new Set([...prev, topicKey]));
                              setCelebratingTopics(prev => new Set([...prev, topicKey]));
                              toast({ title: "🎉 Tebrikler!", description: `${topic.topic} konusunu tamamladınız!` });

                              // 1.5 saniye sonra kutunun animasyonunu kaldır ve 3 saniye sonra kutuyu kaldır
                              setTimeout(() => {
                                setCelebratingTopics(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(topicKey);
                                  return newSet;
                                });
                              }, 1500);
                              
                              // 1.5 saniye sonra kutuyu kaldır
                              setTimeout(() => {
                                setRemovedTopics(prev => new Set([...prev, topicKey]));
                              }, 1500);
                            }
                          }}
                          className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-base text-gray-700 dark:text-gray-300 font-medium leading-relaxed flex-1">{topic.topic}</p>
                      {celebratingTopics.has(`${topic.subject}-${topic.topic}`) && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 animate-bounce">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-bold">Tebrikler!</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className={`px-3 py-1.5 rounded-full font-medium shadow-sm ${topic.source === 'exam' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
                        {topic.source === 'exam' ? '🎯 Deneme' : '📝 Soru'}
                      </span>
                      <span className="text-xs font-medium">{new Date(topic.lastSeen).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geliştirilmiş Hata Sıklığı Analizi Bölümü - Daha Büyük ve Daha Modern */}
      <Card className="bg-gradient-to-br from-orange-50/70 via-white to-red-50/60 dark:from-orange-950/40 dark:via-slate-800/60 dark:to-red-950/30 backdrop-blur-lg border-2 border-orange-200/40 dark:border-orange-800/40 shadow-2xl hover:shadow-3xl transition-all duration-700 group relative overflow-hidden">
        {/* Animasyonlu Arka Plan Elemanları */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-orange-500/15 to-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-red-500/15 to-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-gradient-to-br from-orange-400/5 to-red-400/5 rounded-full blur-2xl"></div>
        
        <CardHeader className="bg-gradient-to-r from-orange-500/15 to-red-500/15 rounded-t-lg border-b border-orange-200/40 pb-8 relative">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-2xl shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110">
              <Brain className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                🔍 Hata Sıklığı Analizi
              </CardTitle>
              <p className="text-sm text-orange-600/70 dark:text-orange-400/70 font-medium mt-2">
                Yanlış konu analizi ve kategori bazında hata sıklığı takibi
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-8 relative min-h-[400px]">
          {(() => {
            // konu bazında tüm yanlış verilerini topla
            let allWrongTopicData: Array<{
              topic: string;
              source: 'question' | 'exam';
              subject: string;
              exam_type: string;
              wrong_count: number;
              study_date: string;
              difficulty?: 'kolay' | 'orta' | 'zor';
              category?: 'kavram' | 'hesaplama' | 'analiz' | 'dikkatsizlik';
            }> = [];

            // Soru günlüklerini işle - hem yapılandırılmış (wrong_topics_json) hem de basit (wrong_topics)
            questionLogs.forEach(log => {
              if (log.wrong_topics && log.wrong_topics.length > 0) {
                // Öncelikle wrong_topics_json'dan yapılandırılmış verileri ayrıştırmayı deneyin
                let structuredTopics: Array<{
                  topic: string;
                  difficulty: 'kolay' | 'orta' | 'zor';
                  category: 'kavram' | 'hesaplama' | 'analiz' | 'dikkatsizlik';
                }> = [];
                
                try {
                  if (log.wrong_topics_json && log.wrong_topics_json.trim() !== '' && log.wrong_topics_json !== 'null' && log.wrong_topics_json !== '[]') {
                    structuredTopics = JSON.parse(log.wrong_topics_json);
                  }
                } catch (e) {
                  console.error('Error parsing wrong_topics_json:', e);
                }

                // Yapılandırılmış konular mevcutsa ekleyin
                if (structuredTopics.length > 0) {
                  structuredTopics.forEach(topicItem => {
                    allWrongTopicData.push({
                      topic: normalizeTopic(topicItem.topic),
                      source: 'question',
                      subject: log.subject, // isim ön ekini burada tutun  
                      exam_type: log.exam_type,
                      wrong_count: parseInt(log.wrong_count) || 0,
                      study_date: log.study_date,
                      difficulty: topicItem.difficulty,
                      category: topicItem.category
                    });
                  });
                } else {
                  // Fall back to simple wrong_topics array
                  log.wrong_topics.forEach(topic => {
                    const topicName = typeof topic === 'string' ? topic : (topic as any)?.topic || '';
                    if (topicName) {
                      allWrongTopicData.push({
                        topic: normalizeTopic(topicName),
                        source: 'question',
                        subject: log.subject, // isim ön ekini burada tutun
                        exam_type: log.exam_type,
                        wrong_count: parseInt(log.wrong_count) || 0,
                        study_date: log.study_date
                      });
                    }
                  });
                }
              }
            });

            // Process exam results
            examResults.forEach(exam => {
              if (exam.subjects_data) {
                try {
                  const subjectsData = JSON.parse(exam.subjects_data);
                  Object.entries(subjectsData).forEach(([subjectKey, data]: [string, any]) => {
                    if (data.wrong_topics && data.wrong_topics.length > 0) {
                      const subjectNameMap: {[key: string]: string} = {
                        'turkce': 'Türkçe',
                        'matematik': 'Matematik',
                        'sosyal': 'Sosyal',
                        'fen': 'Fen',
                        'fizik': 'Fizik',
                        'kimya': 'Kimya',
                        'biyoloji': 'Biyoloji'
                      };
                      const subjectName = subjectNameMap[subjectKey] || subjectKey;
                      
                      data.wrong_topics.forEach((topic: string) => {
                        allWrongTopicData.push({
                          topic: normalizeTopic(topic),
                          source: 'exam',
                          subject: subjectName, // isim ön ekini burada tutun
                          exam_type: exam.exam_type || 'TYT',
                          wrong_count: parseInt(data.wrong) || 0,
                          study_date: exam.exam_date
                        });
                      });
                    }
                  });
                } catch (e) {
                  console.error('Error parsing subjects_data:', e);
                }
              }
            });

            // Konu bazında gruplandır ve verileri topla
            const topicAggregated = allWrongTopicData.reduce((acc, item) => {
              const key = `${item.subject}-${item.topic}`;
              if (acc[key]) {
                acc[key].frequency += 1;
                acc[key].totalWrong += item.wrong_count;
                if (item.study_date > acc[key].lastSeen) {
                  acc[key].lastSeen = item.study_date;
                  acc[key].difficulty = item.difficulty;
                  acc[key].category = item.category;
                }
              } else {
                acc[key] = {
                  topic: item.topic,
                  subject: item.subject,
                  exam_type: item.exam_type,
                  frequency: 1,
                  totalWrong: item.wrong_count,
                  lastSeen: item.study_date,
                  difficulty: item.difficulty,
                  category: item.category,
                  sources: [item.source]
                };
              }
              return acc;
            }, {} as {[key: string]: any});

            const wrongTopicAnalysisData = Object.values(topicAggregated).sort((a: any, b: any) => b.frequency - a.frequency);
            
            if (isLoading) {
              return (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-full mb-6 shadow-lg">
                    <div className="animate-spin w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full"></div>
                  </div>
                  <h4 className="text-xl font-semibold text-orange-700 dark:text-orange-300 mb-3">Hata sıklığı analiz ediliyor...</h4>
                  <div className="flex justify-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500 animate-bounce"></div>
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-bounce delay-100"></div>
                    <div className="w-3 h-3 rounded-full bg-orange-600 animate-bounce delay-200"></div>
                  </div>
                </div>
              );
            }
            
            if (wrongTopicAnalysisData.length === 0) {
              return (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Brain className="h-12 w-12 text-blue-500" />
                  </div>
                  <h4 className="text-2xl font-semibold text-blue-700 dark:text-blue-300 mb-3">Henüz hata analizi verisi yok</h4>
                  <p className="text-base opacity-75">Soru veya deneme ekleyip yanlış konuları girdikçe hata sıklığınız burada görünecek</p>
                </div>
              );
            }
            
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {wrongTopicAnalysisData.slice(0, 15).filter((item: any) => !removedErrorTopics.has(`${item.exam_type}-${item.subject}-${item.topic}`)).map((item: any, index) => {
                  const errorTopicKey = `${item.exam_type}-${item.subject}-${item.topic}`;
                  return (
                  <div key={index} className={`bg-white/70 dark:bg-gray-900/70 rounded-2xl p-6 border border-orange-200/50 dark:border-orange-700/50 hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm relative overflow-hidden group/card ${
                    celebratingErrorTopics.has(errorTopicKey) ? 'animate-pulse bg-green-100/80 dark:bg-green-900/40 border-green-300 dark:border-green-600' : ''
                  }`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-red-50/30 dark:from-orange-950/20 dark:to-red-950/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full shadow-md ${
                            item.exam_type === 'TYT' ? 'bg-blue-500' : 'bg-purple-500'
                          }`}></div>
                          <span className="text-base font-bold text-orange-700 dark:text-orange-300">
                            {item.exam_type} {item.subject}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={completedErrorTopics.has(errorTopicKey)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setCompletedErrorTopics(prev => new Set([...prev, errorTopicKey]));
                                setCelebratingErrorTopics(prev => new Set([...prev, errorTopicKey]));
                                toast({ title: "🎉 Tebrikler!", description: `${item.topic} konusundaki hatanızı çözdünüz!` });

                                // 2 saniye sonra kutunun animasyonunu kaldır ve 3 saniye sonra kutuyu kaldır
                                setTimeout(() => {
                                  setCelebratingErrorTopics(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(errorTopicKey);
                                    return newSet;
                                  });
                                }, 1500);
                                
                                // 1.5 sn
                                setTimeout(() => {
                                  setRemovedErrorTopics(prev => new Set([...prev, errorTopicKey]));
                                }, 1500);
                              } else {
                                setCompletedErrorTopics(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(errorTopicKey);
                                  return newSet;
                                });
                                setRemovedErrorTopics(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(errorTopicKey);
                                  return newSet;
                                });
                              }
                            }}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                          <div className="text-sm text-orange-600 dark:text-orange-400 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/40 dark:to-red-900/40 px-3 py-1.5 rounded-full font-semibold shadow-md">
                            {item.frequency} Kez
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="text-sm bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex-1">{item.topic}</div>
                            {celebratingErrorTopics.has(errorTopicKey) && (
                              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 animate-bounce">
                                <CheckCircle className="h-5 w-5" />
                                <span className="text-sm font-bold">Tebrikler!</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {item.difficulty && (
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                item.difficulty === 'kolay' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                item.difficulty === 'orta' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              }`}>
                                📊 {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                              </span>
                            )}
                            {item.category && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
                                🔍 {item.category === 'kavram' ? 'Kavram Eksikliği' :
                                    item.category === 'hesaplama' ? 'Hesaplama Hatası' :
                                    item.category === 'analiz' ? 'Analiz Sorunu' : 'Dikkatsizlik'}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              item.sources && item.sources.includes('exam') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                            }`}>
                              {item.sources && item.sources.includes('exam') ? '🎯 Deneme' : '📝 Soru'} Hatası
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t border-orange-200/40 dark:border-orange-700/40">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{new Date(item.lastSeen).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4" />
                          <span className="font-medium">Son hata</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Analiz Bölümü */}
      <Card className="bg-gradient-to-br from-indigo-50/50 via-card to-purple-50/50 dark:from-indigo-950/30 dark:via-card dark:to-purple-950/30 backdrop-blur-sm border-2 border-indigo-200/30 dark:border-indigo-800/30 shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-lg border-b border-indigo-200/30">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-indigo-500" />
                📊 Net & Ders Analizi
              </CardTitle>
              <p className="text-sm text-indigo-600/70 dark:text-indigo-400/70 font-medium">
                {analysisMode === 'net' ? 'Deneme net gelişim grafiği ve hedef karşılaştırması' : 'Ders bazında doğru/yanlış dağılımı'}
              </p>
            </div>

            {/* Analiz Modu Değiştirme */}
            <div className="flex bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl p-1 border border-indigo-200/50 dark:border-indigo-700/50">
              <Button
                variant={analysisMode === 'net' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAnalysisMode('net')}
                className={`px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
                  analysisMode === 'net' 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' 
                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50'
                }`}
                data-testid="button-analysis-net"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                📈 Net Analiz
              </Button>
              <Button
                variant={analysisMode === 'subject' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAnalysisMode('subject')}
                className={`px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
                  analysisMode === 'subject' 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' 
                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50'
                }`}
                data-testid="button-analysis-subject"
              >
                <Target className="h-4 w-4 mr-2" />
                🎯 Ders Analiz
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {analysisMode === 'net' ? (
            // TYT/AYT Net Analizi
            netAnalysisData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <TrendingUp className="h-10 w-10 text-blue-500" />
                </div>
                <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">Henüz bir deneme verisi girilmedi.</h4>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Hedefler ve Mevcut Network Ekranı */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50/80 dark:bg-blue-950/30 rounded-xl p-4 text-center border border-blue-200/50 dark:border-blue-800/40">
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-1">TYT Hedef: 90</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      TYT DENEME: {(() => {
                        // En son TYT sınavını bul (tytNet > 0 veya exam_type TYT ise)
                        const tytExams = examResults.filter(exam => 
                          exam.exam_type === 'TYT' || (parseFloat(exam.tyt_net) > 0 && parseFloat(exam.ayt_net) === 0)
                        ).sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
                        return tytExams.length > 0 ? parseFloat(tytExams[0].tyt_net) : 0;
                      })()} net
                    </div>
                  </div>
                  <div className="bg-green-50/80 dark:bg-green-950/30 rounded-xl p-4 text-center border border-green-200/50 dark:border-green-800/40">
                    <div className="text-lg font-bold text-green-700 dark:text-green-300 mb-1">AYT Hedef: 50</div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      AYT DENEME: {(() => {
                        // En son AYT sınavını bul (aytNet > 0 veya exam_type AYT ise)
                        const aytExams = examResults.filter(exam => 
                          exam.exam_type === 'AYT' || (parseFloat(exam.ayt_net) > 0 && parseFloat(exam.tyt_net) === 0)
                        ).sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
                        return aytExams.length > 0 ? parseFloat(aytExams[0].ayt_net) : 0;
                      })()} net
                    </div>
                  </div>
                </div>
                
                <div className="h-96 bg-gradient-to-br from-indigo-50/30 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={netAnalysisData} margin={{ top: 40, right: 60, bottom: 50, left: 40 }}>
                    <defs>
                      <linearGradient id="tytGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="aytGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="currentColor" opacity={0.15} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fontWeight: 600 }}
                      className="text-foreground"
                      axisLine={{ stroke: 'currentColor', opacity: 0.4 }}
                      tickLine={{ stroke: 'currentColor', opacity: 0.4 }}
                      angle={-30}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fontWeight: 600 }}
                      className="text-foreground"
                      axisLine={{ stroke: 'currentColor', opacity: 0.4 }}
                      tickLine={{ stroke: 'currentColor', opacity: 0.4 }}
                      label={{ value: 'Net Sayısı', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontWeight: 600 } }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '2px solid hsl(var(--border))',
                        borderRadius: '16px',
                        fontSize: '14px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                        padding: '16px',
                        backdropFilter: 'blur(8px)'
                      }}
                      labelFormatter={(label, payload) => {
                        const data = payload?.[0]?.payload;
                        return data ? `📊 ${data.examName} - ${label}` : label;
                      }}
                      formatter={(value: any, name: any) => {
                        // ekran boşsa tooltip gösterme
                        if (value === null) return [null, null];
                        
                        if (name === 'tytTarget') return [`${value} net`, '🔵 TYT Hedef: 90 net'];
                        if (name === 'aytTarget') return [`${value} net`, '🔵 AYT Hedef: 50 net'];
                        if (name === 'tytNet') return [`${value} net`, '🟢 TYT DENEME'];
                        if (name === 'aytNet') return [`${value} net`, '🟢 AYT DENEME'];
                        return [`${value} net`, name];
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '30px', fontSize: '14px', fontWeight: 600 }}
                      iconType="line"
                    />

                    {/* Hedef çizgileri */}
                    <Line 
                      type="monotone" 
                      dataKey="tytTarget" 
                      stroke="#3b82f6" 
                      strokeDasharray="10 6" 
                      strokeWidth={3}
                      dot={false} 
                      connectNulls={false}
                      name="🎯 TYT Hedef (90)"
                      opacity={0.8}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="aytTarget" 
                      stroke="#059669" 
                      strokeDasharray="10 6" 
                      strokeWidth={3}
                      dot={false} 
                      connectNulls={false}
                      name="🎯 AYT Hedef (50)"
                      opacity={0.8}
                    />

                    {/* Gerçek netler */}
                    <Line 
                      type="linear" 
                      dataKey="tytNet" 
                      stroke="#3b82f6" 
                      strokeWidth={5}
                      dot={{ fill: '#3b82f6', strokeWidth: 4, r: 8, stroke: '#ffffff', shadow: true }} 
                      activeDot={{ r: 12, stroke: '#3b82f6', strokeWidth: 4, fill: '#ffffff', shadow: '0 0 15px rgba(59, 130, 246, 0.6)' }}
                      connectNulls={true}
                      name="🔵 TYT Net"
                    />
                    <Line 
                      type="linear" 
                      dataKey="aytNet" 
                      stroke="#059669" 
                      strokeWidth={5}
                      dot={{ fill: '#059669', strokeWidth: 4, r: 8, stroke: '#ffffff', shadow: true }} 
                      activeDot={{ r: 12, stroke: '#059669', strokeWidth: 4, fill: '#ffffff', shadow: '0 0 15px rgba(5, 150, 105, 0.6)' }}
                      connectNulls={true}
                      name="🟢 AYT Net"
                    />
                  </LineChart>
                </ResponsiveContainer>
                </div>
              </div>
            )
          ) : (
            // TYT / AYT Ders Analizi
            (tytSubjectAnalysisData.length === 0 && aytSubjectAnalysisData.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Target className="h-10 w-10 text-purple-500" />
                </div>
                <h4 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">Ders verisi bulunmuyor</h4>
                <p className="text-sm opacity-75 mb-4">Deneme ekleyerek ders dağılmı grafik ve analizi burda yapılacak.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* İkiz Radar Grafikleri - TYT ve AYT yan yana */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* TYT Grafiği */}
                  <div className="h-[400px] bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-4">
                    <h3 className="text-lg font-bold text-center mb-4 text-blue-700 dark:text-blue-300">🔵 TYT Ders Analizi</h3>
                    {tytSubjectAnalysisData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="85%">
                        <RadarChart data={tytSubjectAnalysisData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                          <defs>
                            <linearGradient id="tytCorrectGlow" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4}/>
                              <stop offset="100%" stopColor="#16a34a" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="tytWrongGlow" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4}/>
                              <stop offset="100%" stopColor="#dc2626" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <PolarGrid stroke="currentColor" className="opacity-25" strokeWidth={1} />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 600 }} />
                          <PolarRadiusAxis angle={0} domain={[0, 'dataMax']} tick={{ fontSize: 10 }} />
                          <Tooltip content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white/95 dark:bg-gray-800/95 p-3 rounded-lg shadow-lg border">
                                  <p className="font-semibold mb-1">{label}</p>
                                  {payload.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                      <span>{entry.name === '✅ Doğru Cevaplar' ? '✅' : '❌'} {entry.name}: {entry.value}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }} />
                          <Radar name="✅ Doğru Cevaplar" dataKey="correct" stroke="#22c55e" strokeWidth={2} fill="url(#tytCorrectGlow)" fillOpacity={0.3} dot={{ r: 4, fill: '#22c55e' }} />
                          <Radar name="❌ Yanlış Cevaplar" dataKey="wrong" stroke="#ef4444" strokeWidth={2} fill="url(#tytWrongGlow)" fillOpacity={0.3} dot={{ r: 4, fill: '#ef4444' }} />
                          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center">
                        <div>
                          <div className="text-4xl mb-2">📊</div>
                          <p className="text-sm text-muted-foreground">Henüz TYT deneme verisi yok</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AYT Grafiği */}
                  <div className="h-[400px] bg-gradient-to-br from-green-50/30 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-4">
                    <h3 className="text-lg font-bold text-center mb-4 text-green-700 dark:text-green-300">🟢 AYT Ders Analizi</h3>
                    {aytSubjectAnalysisData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="85%">
                        <RadarChart data={aytSubjectAnalysisData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                          <defs>
                            <linearGradient id="aytCorrectGlow" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4}/>
                              <stop offset="100%" stopColor="#16a34a" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="aytWrongGlow" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4}/>
                              <stop offset="100%" stopColor="#dc2626" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <PolarGrid stroke="currentColor" className="opacity-25" strokeWidth={1} />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 600 }} />
                          <PolarRadiusAxis angle={0} domain={[0, 'dataMax']} tick={{ fontSize: 10 }} />
                          <Tooltip content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white/95 dark:bg-gray-800/95 p-3 rounded-lg shadow-lg border">
                                  <p className="font-semibold mb-1">{label}</p>
                                  {payload.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                      <span>{entry.name === '✅ Doğru Cevaplar' ? '✅' : '❌'} {entry.name}: {entry.value}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }} />
                          <Radar name="✅ Doğru Cevaplar" dataKey="correct" stroke="#22c55e" strokeWidth={2} fill="url(#aytCorrectGlow)" fillOpacity={0.3} dot={{ r: 4, fill: '#22c55e' }} />
                          <Radar name="❌ Yanlış Cevaplar" dataKey="wrong" stroke="#ef4444" strokeWidth={2} fill="url(#aytWrongGlow)" fillOpacity={0.3} dot={{ r: 4, fill: '#ef4444' }} />
                          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center">
                        <div>
                          <div className="text-4xl mb-2">📊</div>
                          <p className="text-sm text-muted-foreground">Henüz AYT deneme verisi yok</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TYT ve AYT Ders Özeti */}
                <div className="space-y-4">
                  {/* TYT ÖZet Kartları */}
                  {tytSubjectAnalysisData.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-300">🔵 TYT Ders Özeti</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {tytSubjectAnalysisData.map((subject, index) => (
                          <div key={index} className="bg-blue-50/60 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200/40 dark:border-blue-700/40 hover:shadow-lg transition-all duration-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-800 dark:text-gray-200">{subject.subject}</h4>
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }}></div>
                            </div>
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-green-600 dark:text-green-400">✓ Doğru</span>
                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{subject.correct}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-red-600 dark:text-red-400">✗ Yanlış</span>
                                <span className="text-sm font-semibold text-red-600 dark:text-red-400">{subject.wrong}</span>
                              </div>
                              <div className="flex justify-between items-center border-t pt-2">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Net</span>
                                <span className="text-sm font-bold" style={{ color: subject.color }}>{subject.netScore.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AYT Özet Kartları */}
                  {aytSubjectAnalysisData.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-300">🟢 AYT Ders Özeti</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {aytSubjectAnalysisData.map((subject, index) => (
                          <div key={index} className="bg-green-50/60 dark:bg-green-900/20 rounded-xl p-4 border border-green-200/40 dark:border-green-700/40 hover:shadow-lg transition-all duration-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-800 dark:text-gray-200">{subject.subject}</h4>
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }}></div>
                            </div>
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-green-600 dark:text-green-400">✓ Doğru</span>
                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{subject.correct}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-red-600 dark:text-red-400">✗ Yanlış</span>
                                <span className="text-sm font-semibold text-red-600 dark:text-red-400">{subject.wrong}</span>
                              </div>
                              <div className="flex justify-between items-center border-t pt-2">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Net</span>
                                <span className="text-sm font-bold" style={{ color: subject.color }}>{subject.netScore.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Performans optimizasyonu için React.memo ile sarılmış bileşen
export const AdvancedCharts = memo(AdvancedChartsComponent);
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
