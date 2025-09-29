//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertTaskSchema,
  insertMoodSchema,
  insertGoalSchema,
  insertQuestionLogSchema,
  insertExamResultSchema,
  insertFlashcardSchema,
  insertExamSubjectNetSchema,
} from "@shared/schema";
import { z } from "zod";
import dotenv from "dotenv";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import PDFKit from "pdfkit";
import nodemailer from "nodemailer";
dotenv.config();

export async function registerRoutes(app: Express): Promise<Server> {
  // Görev routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid task data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, validatedData);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid task data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update task" });
      }
    }
  });

  app.patch("/api/tasks/:id/toggle", async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.toggleTaskComplete(id);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle task completion" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTask(id);

      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Ruh hali routes
  app.get("/api/moods", async (req, res) => {
    try {
      const moods = await storage.getMoods();
      res.json(moods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch moods" });
    }
  });

  app.get("/api/moods/latest", async (req, res) => {
    try {
      const mood = await storage.getLatestMood();
      res.json(mood);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch latest mood" });
    }
  });

  app.post("/api/moods", async (req, res) => {
    try {
      const validatedData = insertMoodSchema.parse(req.body);
      const mood = await storage.createMood(validatedData);
      res.status(201).json(mood);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid mood data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create mood" });
      }
    }
  });

  // raporlarım ve takvim kısmı routes
  app.get("/api/summary/daily", async (req, res) => {
    try {
      const range = parseInt(req.query.range as string) || 30;
      const summary = await storage.getDailySummary(range);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily summary" });
    }
  });

  app.get("/api/calendar/:date", async (req, res) => {
    try {
      const { date } = req.params; // YYYY-AA-GG format
      const tasksForDate = await storage.getTasksByDate(date);

      // günlük kalan gün sayısı hesaplama
      const today = new Date();
      const targetDate = new Date(date);

      // Her iki tarihi de karşılaştırmak için gece yarısına ayarlama
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      res.json({
        date,
        dayNumber: targetDate.getDate(),
        daysRemaining: diffDays,
        tasks: tasksForDate,
        tasksCount: tasksForDate.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calendar data" });
    }
  });

  // NET HESAPLAMA
  app.post("/api/calculate-ranking", async (req, res) => {
    try {
      const { nets, year } = req.body;
      
      // nets objesi örneği:
      let tytNets = 0;
      let aytNets = 0;
      
      // TYT neti hesaplama
      if (nets?.tyt) {
        const tyt = nets.tyt;
        tytNets = (parseFloat(tyt.turkce) || 0) + 
                  (parseFloat(tyt.sosyal) || 0) + 
                  (parseFloat(tyt.matematik) || 0) + 
                  (parseFloat(tyt.fen) || 0);
      }
      
      // AYT neti hesaplama
      if (nets?.ayt) {
        const ayt = nets.ayt;
        aytNets = (parseFloat(ayt.matematik) || 0) + 
                  (parseFloat(ayt.fizik) || 0) + 
                  (parseFloat(ayt.kimya) || 0) + 
                  (parseFloat(ayt.biyoloji) || 0);
      }

      // 2023-2025 YKS sıralama verileri (yaklaşık değerler)
      //burası kullanılmayacak
      const rankingData: Record<string, any> = {
        "2023": {
          tytWeight: 0.4,
          aytWeight: 0.6,
          rankings: {
            350: 1000,
            320: 5000,
            300: 10000,
            280: 20000,
            260: 35000,
            240: 50000,
            220: 75000,
            200: 100000,
            180: 150000,
            160: 200000,
          },
        },
        "2024": {
          tytWeight: 0.4,
          aytWeight: 0.6,
          rankings: {
            360: 1000,
            330: 5000,
            310: 10000,
            290: 20000,
            270: 35000,
            250: 50000,
            230: 75000,
            210: 100000,
            190: 150000,
            170: 200000,
          },
        },
        "2025": {
          tytWeight: 0.4,
          aytWeight: 0.6,
          rankings: {
            355: 1000,
            325: 5000,
            305: 10000,
            285: 20000,
            265: 35000,
            245: 50000,
            225: 75000,
            205: 100000,
            185: 150000,
            165: 200000,
          },
        },
      };

      const yearData = rankingData[year] || rankingData["2024"];

      // numarasal hatalara karşı kontrol
      if (isNaN(tytNets)) tytNets = 0;
      if (isNaN(aytNets)) aytNets = 0;

      // Net'i puana çevirme (yaklaşık formül)
      const tytScore = tytNets * 4; // Her doğru ~4 puan
      const aytScore = aytNets * 4; // Her doğru ~4 puan

      // Ağırlıklı toplam puan
      const totalScore = tytScore * yearData.tytWeight + aytScore * yearData.aytWeight;

      // En yakın sıralamayı bul
      let estimatedRanking = 500000; // Varsayılan
      const scores = Object.keys(yearData.rankings)
        .map(Number)
        .sort((a, b) => b - a);

      for (const score of scores) {
        if (totalScore >= score) {
          estimatedRanking = yearData.rankings[score];
          break;
        }
      }

      res.json({
        tytScore: tytScore.toFixed(2),
        aytScore: aytScore.toFixed(2),
        totalScore: totalScore.toFixed(2),
        estimatedRanking,
        year,
        methodology: "2023-2025 YKS verilerine dayalı tahmin",
      });
    } catch (error) {
      console.error("Ranking calculation error:", error);
      res.status(500).json({ message: "Sıralama hesaplanamadı" });
    }
  });

  // Goal routes
  app.get("/api/goals", async (req, res) => {
    try {
      const goals = await storage.getGoals();
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const validatedData = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(validatedData);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid goal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create goal" });
      }
    }
  });

  app.put("/api/goals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertGoalSchema.partial().parse(req.body);
      const goal = await storage.updateGoal(id, validatedData);

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid goal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update goal" });
      }
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGoal(id);

      if (!deleted) {
        return res.status(404).json({ message: "Goal not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Sakarya,serdivan için hava durumu route
  app.get("/api/weather", async (req, res) => {
    try {
      const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

      let currentData, forecastData, airQualityData, uvData;

      if (!OPENWEATHER_API_KEY) {
        console.log("OpenWeather API key not found, using static data");
        // API anahtarı yoksa statik veri kullan
        currentData = {
          main: {
            temp: 18,
            temp_max: 20,
            temp_min: 15,
            humidity: 75,
            pressure: 1013,
            feels_like: 18,
          },
          weather: [{ id: 800, description: "açık", main: "Clear" }],
          wind: { speed: 2.5, deg: 180 },
          clouds: { all: 20 },
          visibility: 10000,
          sys: {
            sunrise: Math.floor(new Date().setHours(5, 54, 0, 0) / 1000),
            sunset: Math.floor(new Date().setHours(18, 53, 0, 0) / 1000),
          },
          rain: undefined,
          snow: undefined,
        } as any;
        forecastData = { list: [] };
        airQualityData = {
          list: [
            { main: { aqi: 2 }, components: { pm2_5: 15, pm10: 25, o3: 60 } },
          ],
        };
        uvData = { value: 4 };
      } else {
        // Sakarya, Serdivan için gerçek OpenWeather API çağrıları (lat: 40.7969, lon: 30.3781)
        const lat = 40.7969;
        const lon = 30.3781;

        try {
          // hava durumu
          const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=tr`,
          );
          currentData = await currentResponse.json();

          // 5 günlük tahmin
          const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=tr`,
          );
          forecastData = await forecastResponse.json();

          // hava kalitesi
          const airQualityResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`,
          );
          airQualityData = await airQualityResponse.json();

          // uv indeksi
          const uvResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`,
          );
          uvData = await uvResponse.json();
        } catch (apiError) {
          console.error(
            "OpenWeather API error, falling back to static data:",
            apiError,
          );
          // geriye statik veri döndür
          currentData = {
            main: {
              temp: 18,
              temp_max: 20,
              temp_min: 15,
              humidity: 75,
              pressure: 1013,
              feels_like: 18,
            },
            weather: [{ id: 800, description: "açık", main: "Clear" }],
            wind: { speed: 2.5, deg: 180 },
            clouds: { all: 20 },
            visibility: 10000,
            sys: {
              sunrise: Math.floor(new Date().setHours(5, 54, 0, 0) / 1000),
              sunset: Math.floor(new Date().setHours(18, 53, 0, 0) / 1000),
            },
          };
          forecastData = { list: [] };
          airQualityData = {
            list: [
              { main: { aqi: 2 }, components: { pm2_5: 15, pm10: 25, o3: 60 } },
            ],
          };
          uvData = { value: 4 };
        }
      }

      // emoji fonksiyonu
      const getWeatherEmoji = (weatherId: number, isDay: boolean = true) => {
        if (weatherId >= 200 && weatherId < 300) return "⛈️"; // gök gürültülü
        if (weatherId >= 300 && weatherId < 400) return "🌦️"; // hafif yağmur
        if (weatherId >= 500 && weatherId < 600) return "🌧️"; // yağmur
        if (weatherId >= 600 && weatherId < 700) return "❄️"; // kar
        if (weatherId >= 700 && weatherId < 800) return "🌫️"; // sis
        if (weatherId === 800) return isDay ? "☀️" : "🌙"; // açık
        if (weatherId > 800) return isDay ? "⛅" : "☁️"; // bulutlu
        return "🌤️";
      };

      // 12 saatlik tahmin işleme
      const hourlyForecast = [];
      const currentHour = new Date().getHours();

      for (let i = 0; i < 12; i++) {
        const hour = (currentHour + i) % 24;
        const isDay = hour >= 6 && hour <= 19;

        // Gün boyunca sıcaklık değişimi
        let temp = 18; // Temel sıcaklık
        if (hour >= 6 && hour <= 8)
          temp = 16; // Sabah serin
        else if (hour >= 9 && hour <= 11)
          temp = 19; // Geç sabah sıcak
        else if (hour >= 12 && hour <= 15)
          temp = 21; // Öğle en sıcak
        else if (hour >= 16 && hour <= 18)
          temp = 20; // Akşam serin
        else if (hour >= 19 && hour <= 21)
          temp = 18; // Gece serin
        else temp = 15; // Gece en serin

        // Rastgelelik ekle ama gerçekçi tut
        temp += Math.floor(Math.random() * 3) - 1; // ±1°C

        // Hava durumu koşulları - çeşitlilik için karışım
        let weatherId = 800; // Açık varsayılan
        let precipitation = 0;

        if (i === 2 || i === 3) {
          weatherId = 801; // Az bulutlu
        } else if (i === 5 || i === 6) {
          weatherId = 802; // Parçalı bulutlu
        } else if (i === 8) {
          weatherId = 500; // Hafif yağmur
          precipitation = 0.5;
        }

        hourlyForecast.push({
          time: `${hour.toString().padStart(2, "0")}:00`,
          hour: hour,
          temperature: temp,
          emoji: getWeatherEmoji(weatherId, isDay),
          humidity: 75 + Math.floor(Math.random() * 10) - 5, // 70-80% nem
          windSpeed: 8 + Math.floor(Math.random() * 6), // 8-14 km/h rüzgar
          windDirection: 180 + Math.floor(Math.random() * 60) - 30, // Değişken rüzgar yönü
          precipitation: precipitation,
          description:
            weatherId === 800
              ? "açık"
              : weatherId === 801
                ? "az bulutlu"
                : weatherId === 802
                  ? "parçalı bulutlu"
                  : "hafif yağmur",
        });
      }

      // 7 günlük tahmin işleme
      const dailyForecast: any[] = [];
      const today = new Date();

      // Özel günler için tahmin verileri
      const customForecast = [
        // Bugün - mevcut hava durumunu kullan
        {
          date: today.toISOString().split("T")[0],
          dayName: today.toLocaleDateString("tr-TR", { weekday: "short" }),
          temperature: {
            max: Math.round(
              currentData.main.temp_max || currentData.main.temp + 3,
            ),
            min: Math.round(
              currentData.main.temp_min || currentData.main.temp - 3,
            ),
          },
          description: currentData.weather[0].description,
          emoji: getWeatherEmoji(currentData.weather[0].id),
          humidity: currentData.main.humidity,
          windSpeed: Math.round(currentData.wind.speed * 3.6),
        },
      ];

      // 6 günlük özel tahmin verisi
      for (let i = 1; i <= 6; i++) {
        const forecastDate = new Date(today);
        forecastDate.setDate(today.getDate() + i);
        const dayName = forecastDate.toLocaleDateString("tr-TR", {
          weekday: "short",
        });

        let weatherData;
        switch (dayName.toLowerCase()) {
          case "çar": // carsamba
            weatherData = {
              temperature: { max: 18, min: 12 },
              description: "sis",
              emoji: "🌫️",
              humidity: 85,
              windSpeed: 8,
            };
            break;
          case "per": // perşembe
            weatherData = {
              temperature: { max: 19, min: 13 },
              description: "gökgürültülü sağanak",
              emoji: "⛈️",
              humidity: 80,
              windSpeed: 15,
            };
            break;
          case "cum": // cuma
            weatherData = {
              temperature: { max: 19, min: 13 },
              description: "gökgürültülü sağanak",
              emoji: "⛈️",
              humidity: 78,
              windSpeed: 12,
            };
            break;
          case "cmt": // cumartesi
            weatherData = {
              temperature: { max: 18, min: 12 },
              description: "yağmurlu",
              emoji: "🌧️",
              humidity: 88,
              windSpeed: 10,
            };
            break;
          case "paz": // pazar
            weatherData = {
              temperature: { max: 19, min: 13 },
              description: "gökgürültülü sağanak",
              emoji: "⛈️",
              humidity: 82,
              windSpeed: 14,
            };
            break;
          default:
            // diğer günler için genel tahmin
            weatherData = {
              temperature: { max: 20, min: 14 },
              description: "parçalı bulutlu",
              emoji: "⛅",
              humidity: 65,
              windSpeed: 8,
            };
        }

        customForecast.push({
          date: forecastDate.toISOString().split("T")[0],
          dayName: dayName,
          ...weatherData,
        });
      }

      // custom forecast'u dailyForecast'a ekle
      dailyForecast.push(...customForecast);

      // hava durumu detayları
      const now = new Date();
      const sunrise = new Date(currentData.sys.sunrise * 1000);
      const sunset = new Date(currentData.sys.sunset * 1000);
      const isDay = now > sunrise && now < sunset;

      // UV indeksi hesaplama (gerçek UV API'si başarısız olursa yedek)
      const getUVIndex = () => {
        if (uvData && uvData.value !== undefined) {
          const uvValue = Math.round(uvData.value);
          let level, description;

          if (uvValue <= 2) {
            level = "Düşük";
            description = "Güvenli seviyede, koruma gereksiz";
          } else if (uvValue <= 5) {
            level = "Orta";
            description = "Orta seviye risk, güneş kremi önerilir";
          } else if (uvValue <= 7) {
            level = "Yüksek";
            description = "Koruyucu önlemler gerekli";
          } else if (uvValue <= 10) {
            level = "Çok Yüksek";
            description = "Güçlü koruma şart, gölgeyi tercih edin";
          } else {
            level = "Aşırı";
            description = "Dışarı çıkmaktan kaçının";
          }

          return { value: uvValue, level, description };
        }

        // uv API yoksa basit hesaplama
        if (!isDay)
          return {
            value: 0,
            level: "Düşük",
            description: "Gece boyunca UV endeksi düşük",
          };
        const hour = now.getHours();
        if (hour < 8 || hour > 18)
          return { value: 1, level: "Düşük", description: "Güvenli seviyede" };
        if (hour >= 10 && hour <= 16) {
          const baseUV =
            currentData.clouds.all < 30
              ? 8
              : currentData.clouds.all < 70
                ? 5
                : 3;
          return baseUV > 7
            ? {
                value: baseUV,
                level: "Yüksek",
                description: "Koruyucu önlemler gerekli",
              }
            : { value: baseUV, level: "Orta", description: "Orta seviye risk" };
        }
        return { value: 3, level: "Orta", description: "Orta seviye risk" };
      };

      // hava kalitesi hesaplama
      const airQuality = airQualityData
        ? {
            aqi: airQualityData.list[0].main.aqi,
            level:
              ["İyi", "Orta", "Hassas", "Sağlıksız", "Çok Sağlıksız"][
                airQualityData.list[0].main.aqi - 1
              ] || "Bilinmiyor",
            description:
              airQualityData.list[0].main.aqi <= 2
                ? "Temiz hava"
                : "Hava kalitesine dikkat edin",
            components: {
              pm2_5: airQualityData.list[0].components.pm2_5,
              pm10: airQualityData.list[0].components.pm10,
              o3: airQualityData.list[0].components.o3,
            },
          }
        : null;

      // Geliştirilmiş yaşam tarzı indeksleri
      const temp = currentData.main.temp;
      const windSpeed = Math.round(currentData.wind.speed * 3.6);
      const humidity = currentData.main.humidity;
      const isRaining =
        currentData.weather[0].id >= 500 && currentData.weather[0].id < 600;
      const isSnowing =
        currentData.weather[0].id >= 600 && currentData.weather[0].id < 700;
      const visibility = currentData.visibility || 10000;
      const uvValue = uvData?.value || 0;
      const airQualityIndex = airQualityData?.list[0]?.main?.aqi || 3;

      const lifeIndices = {
        exercise: {
          level: (() => {
            if (isRaining || isSnowing) return "Kötü";
            if (temp < 5 || temp > 35) return "Kötü";
            if (temp < 10 || temp > 30) return "Orta";
            if (airQualityIndex > 3) return "Orta";
            if (windSpeed > 25) return "Orta";
            return "İyi";
          })(),
          emoji: "🏃",
          description: (() => {
            if (isRaining || isSnowing) return "Hava koşulları uygun değil";
            if (temp > 35) return "Aşırı sıcak, egzersizden kaçının";
            if (temp > 30) return "Çok sıcak, sabah/akşam saatleri tercih edin";
            if (temp < 5) return "Çok soğuk, kapalı alan tercih edin";
            if (temp < 10) return "Soğuk, ısınma egzersizleri yapın";
            if (airQualityIndex > 3) return "Hava kalitesi düşük, dikkat edin";
            if (windSpeed > 25) return "Güçlü rüzgar, dikkatli olun";
            return "Dış egzersiz için mükemmel koşullar";
          })(),
        },
        clothing: {
          level: "Uygun",
          emoji: (() => {
            if (temp > 28) return "👕";
            if (temp > 20) return "👔";
            if (temp > 10) return "🧥";
            if (temp > 0) return "🧥";
            return "🧥";
          })(),
          description: (() => {
            if (isRaining) return "Yağmurluk ve şemsiye gerekli";
            if (isSnowing) return "Kalın mont ve bot gerekli";
            if (temp > 28) return "Hafif ve nefes alabilir kıyafetler";
            if (temp > 20) return "Hafif kıyafetler, ince ceket";
            if (temp > 10) return "Orta kalınlık ceket önerilir";
            if (temp > 0) return "Kalın mont ve eldiven gerekli";
            return "Çok kalın kıyafetler, bere ve eldiven şart";
          })(),
        },
        travel: {
          level: (() => {
            if (visibility < 2000) return "Kötü";
            if (isRaining && windSpeed > 20) return "Kötü";
            if (isSnowing || windSpeed > 30) return "Kötü";
            if (isRaining || windSpeed > 20) return "Orta";
            return "İyi";
          })(),
          emoji: "🚗",
          description: (() => {
            if (visibility < 2000)
              return "Görüş mesafesi çok düşük, ertelenebilirse erteleyin";
            if (isSnowing) return "Kar nedeniyle çok dikkatli sürün";
            if (isRaining && windSpeed > 20)
              return "Yağmur ve rüzgar, çok dikkatli olun";
            if (isRaining) return "Yağışlı hava, hızınızı azaltın";
            if (windSpeed > 30) return "Aşırı rüzgar, seyahati erteleyin";
            if (windSpeed > 20) return "Güçlü rüzgar, dikkatli sürün";
            return "Seyahat için uygun koşullar";
          })(),
        },
        skin: {
          level: (() => {
            if (uvValue > 7) return "Yüksek Risk";
            if (uvValue > 3) return "Orta Risk";
            if (humidity < 30 || humidity > 80) return "Dikkat";
            return "İyi";
          })(),
          emoji: "🧴",
          description: (() => {
            if (uvValue > 7)
              return "Güçlü güneş kremi ve koruyucu kıyafet şart";
            if (uvValue > 3) return "Güneş kremi ve şapka önerilir";
            if (humidity > 80)
              return "Yağlı ciltler için hafif nemlendiriciler";
            if (humidity < 30) return "Kuru hava, yoğun nemlendirici kullanın";
            return "Normal cilt bakımı yeterli";
          })(),
        },
        driving: {
          level: (() => {
            if (visibility < 1000) return "Tehlikeli";
            if (isSnowing || (isRaining && windSpeed > 25)) return "Kötü";
            if (isRaining || windSpeed > 20) return "Dikkatli";
            if (visibility < 5000) return "Dikkatli";
            return "İyi";
          })(),
          emoji: "🚙",
          description: (() => {
            if (visibility < 1000) return "Görüş sıfıra yakın, sürmeyin";
            if (isSnowing) return "Kar nedeniyle çok yavaş ve dikkatli sürün";
            if (isRaining && windSpeed > 25)
              return "Fırtına koşulları, mümkünse beklemeyin";
            if (isRaining) return "Yağmur, fren mesafesini artırın";
            if (windSpeed > 20) return "Rüzgar yan yana araçları etkileyebilir";
            if (visibility < 5000) return "Sisli hava, farları açın";
            return "Sürüş için ideal koşullar";
          })(),
        },
      };

      const responseData = {
        location: "Serdivan, Sakarya",
        current: {
          temperature: Math.round(currentData.main.temp),
          description: currentData.weather[0].description,
          emoji: getWeatherEmoji(currentData.weather[0].id, isDay),
          humidity: currentData.main.humidity,
          windSpeed: Math.round(currentData.wind.speed * 3.6),
          windDirection: currentData.wind.deg,
          windDescription:
            windSpeed < 5
              ? "sakin"
              : windSpeed < 15
                ? "hafif meltem"
                : "güçlü rüzgar",
          feelsLike: Math.round(currentData.main.feels_like),
          pressure: currentData.main.pressure,
          visibility: Math.round(currentData.visibility / 1000),
          precipitation: currentData.rain
            ? currentData.rain["1h"] || 0
            : currentData.snow
              ? currentData.snow["1h"] || 0
              : 0,
        },
        hourlyForecast,
        sunData: {
          sunrise: sunrise.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          sunset: sunset.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          dayLength: `${Math.round((sunset.getTime() - sunrise.getTime()) / 3600000)}s ${Math.round(((sunset.getTime() - sunrise.getTime()) % 3600000) / 60000)}dk`,
          sunProgress: isDay
            ? ((now.getTime() - sunrise.getTime()) /
                (sunset.getTime() - sunrise.getTime())) *
              100
            : 0,
        },
        forecast: dailyForecast,
        uvIndex: getUVIndex(),
        airQuality,
        lifeIndices,
      };

      res.json(responseData);
    } catch (error) {
      console.error("Weather API error:", error);
      res.status(500).json({ message: "Hava durumu verileri alınamadı" });
    }
  });

  // cevap logları routes
  app.get("/api/question-logs", async (req, res) => {
    try {
      const logs = await storage.getQuestionLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch question logs" });
    }
  });

  app.post("/api/question-logs", async (req, res) => {
    try {
      const validatedData = insertQuestionLogSchema.parse(req.body);
      const log = await storage.createQuestionLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid question log data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create question log" });
      }
    }
  });

  app.get("/api/question-logs/range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "Start date and end date are required" });
      }
      const logs = await storage.getQuestionLogsByDateRange(
        startDate as string,
        endDate as string,
      );
      res.json(logs);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch question logs by date range" });
    }
  });

  app.delete("/api/question-logs/all", async (req, res) => {
    try {
      await storage.deleteAllQuestionLogs();
      res.json({ message: "All question logs deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete all question logs" });
    }
  });

  app.delete("/api/question-logs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteQuestionLog(id);

      if (!deleted) {
        return res.status(404).json({ message: "Question log not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete question log" });
    }
  });

  // Konu istatistikleri routes
  app.get("/api/topics/stats", async (req, res) => {
    try {
      const stats = await storage.getTopicStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch topic statistics" });
    }
  });

  app.get("/api/topics/priority", async (req, res) => {
    try {
      const priorityTopics = await storage.getPriorityTopics();
      res.json(priorityTopics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch priority topics" });
    }
  });

  app.get("/api/subjects/stats", async (req, res) => {
    try {
      const stats = await storage.getSubjectSolvedStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subject statistics" });
    }
  });

  // Sınav sonuçları routes
  app.get("/api/exam-results", async (req, res) => {
    try {
      const results = await storage.getExamResults();
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exam results" });
    }
  });

  app.post("/api/exam-results", async (req, res) => {
    try {
      const validatedData = insertExamResultSchema.parse(req.body);
      const result = await storage.createExamResult(validatedData);

      // Eğer subjects_data sağlanmışsa, sınav konu netleri oluştur
      if (validatedData.subjects_data) {
        try {
          const subjectsData = JSON.parse(validatedData.subjects_data);

          // Her konu için veri ile konu netleri oluştur
          for (const [subjectName, subjectData] of Object.entries(
            subjectsData,
          )) {
            const data = subjectData as any;
            if (data.correct || data.wrong || data.blank) {
              const correct = parseInt(data.correct) || 0;
              const wrong = parseInt(data.wrong) || 0;
              const blank = parseInt(data.blank) || 0;
              const netScore = correct - wrong * 0.25;

              // ders isimlerini Türkçe'ye çevir
              const subjectNameMap: { [key: string]: string } = {
                turkce: "Türkçe",
                matematik: "Matematik",
                sosyal: "Sosyal",
                fen: "Fen",
                fizik: "Fizik",
                kimya: "Kimya",
                biyoloji: "Biyoloji",
              };

              // dersin TYT mi AYT mi olduğunu belirle
              const isTYTSubject = [
                "turkce",
                "matematik",
                "sosyal",
                "fen",
              ].includes(subjectName);
              const examType = isTYTSubject ? "TYT" : "AYT";
              const mappedSubjectName =
                subjectNameMap[subjectName] || subjectName;

              await storage.createExamSubjectNet({
                exam_id: result.id,
                exam_type: examType,
                subject: mappedSubjectName,
                net_score: netScore.toString(),
                correct_count: correct.toString(),
                wrong_count: wrong.toString(),
                blank_count: blank.toString(),
              });

              // yanlış yapılan konular loglarını oluştur
              if (
                data.wrong_topics &&
                data.wrong_topics.length > 0 &&
                wrong > 0
              ) {
                await storage.createQuestionLog({
                  exam_type: examType,
                  subject: mappedSubjectName,
                  correct_count: correct.toString(),
                  wrong_count: wrong.toString(),
                  blank_count: blank.toString(),
                  wrong_topics: data.wrong_topics,
                  study_date: validatedData.exam_date,
                  time_spent_minutes: null,
                });
              }
            }
          }
        } catch (parseError) {
          console.error("Failed to parse subjects_data:", parseError);
        }
      }

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid exam result data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create exam result" });
      }
    }
  });

  app.delete("/api/exam-results/all", async (req, res) => {
    try {
      await storage.deleteAllExamResults();
      res.json({ message: "All exam results deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete all exam results" });
    }
  });

  app.delete("/api/exam-results/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExamResult(id);

      if (!deleted) {
        return res.status(404).json({ message: "Exam result not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete exam result" });
    }
  });

  // örnek ders netleri routes
  app.get("/api/exam-subject-nets", async (req, res) => {
    try {
      const nets = await storage.getExamSubjectNets();
      res.json(nets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exam subject nets" });
    }
  });

  app.get("/api/exam-subject-nets/exam/:examId", async (req, res) => {
    try {
      const { examId } = req.params;
      const nets = await storage.getExamSubjectNetsByExamId(examId);
      res.json(nets);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch exam subject nets for exam" });
    }
  });

  app.post("/api/exam-subject-nets", async (req, res) => {
    try {
      const validatedData = insertExamSubjectNetSchema.parse(req.body);
      const net = await storage.createExamSubjectNet(validatedData);
      res.status(201).json(net);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: "Invalid exam subject net data",
          errors: error.errors,
        });
      } else if (
        error instanceof Error &&
        error.message.includes("does not exist")
      ) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create exam subject net" });
      }
    }
  });

  app.put("/api/exam-subject-nets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertExamSubjectNetSchema
        .partial()
        .parse(req.body);
      const net = await storage.updateExamSubjectNet(id, validatedData);

      if (!net) {
        return res.status(404).json({ message: "Exam subject net not found" });
      }

      res.json(net);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: "Invalid exam subject net data",
          errors: error.errors,
        });
      } else {
        res.status(500).json({ message: "Failed to update exam subject net" });
      }
    }
  });

  app.delete("/api/exam-subject-nets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExamSubjectNet(id);

      if (!deleted) {
        return res.status(404).json({ message: "Exam subject net not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete exam subject net" });
    }
  });

  app.delete("/api/exam-subject-nets/exam/:examId", async (req, res) => {
    try {
      const { examId } = req.params;
      const deleted = await storage.deleteExamSubjectNetsByExamId(examId);

      if (!deleted) {
        return res
          .status(404)
          .json({ message: "No exam subject nets found for this exam" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete exam subject nets" });
    }
  });
  //ARTIK KULLANMAYACAĞIMIZ ROUTESLAR
  // Flashcard routes - commented out until implementation is complete
  /*
  app.get("/api/flashcards", async (req, res) => {
    try {
      const flashcards = await storage.getFlashcards();
      res.json(flashcards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch flashcards" });
    }
  });

  app.get("/api/flashcards/due", async (req, res) => {
    try {
      const flashcards = await storage.getFlashcardsDue();
      res.json(flashcards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch due flashcards" });
    }
  });

  app.post("/api/flashcards", async (req, res) => {
    try {
      const validatedData = insertFlashcardSchema.parse(req.body);
      const flashcard = await storage.createFlashcard(validatedData);
      res.status(201).json(flashcard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid flashcard data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create flashcard" });
      }
    }
  });

  app.put("/api/flashcards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertFlashcardSchema.partial().parse(req.body);
      const flashcard = await storage.updateFlashcard(id, validatedData);

      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }

      res.json(flashcard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid flashcard data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update flashcard" });
      }
    }
  });

  app.post("/api/flashcards/:id/review", async (req, res) => {
    try {
      const { id } = req.params;
      const { difficulty, isCorrect, userAnswer } = req.body;

      if (!["easy", "medium", "hard"].includes(difficulty)) {
        return res.status(400).json({ message: "Invalid difficulty level" });
      }

      const flashcard = await storage.reviewFlashcard(id, difficulty);

      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }

      // Eğer cevap yanlışsa hata takibine ekle
      if (!isCorrect && userAnswer && flashcard) {
        await storage.addFlashcardError({
          cardId: id,
          question: flashcard.question,
          topic: flashcard.topic || flashcard.subject,
          difficulty: flashcard.difficulty,
          userAnswer,
          correctAnswer: flashcard.answer,
          timestamp: new Date(),
        });
      }

      res.json(flashcard);
    } catch (error) {
      res.status(500).json({ message: "Failed to review flashcard" });
    }
  });

  // Hata sıklığı analizi için route
  app.get("/api/flashcards/errors", async (req, res) => {
    try {
      const errors = await storage.getFlashcardErrors();
      res.json(errors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch flashcard errors" });
    }
  });

  app.get("/api/flashcards/errors/by-difficulty", async (req, res) => {
    try {
      const errorsByDifficulty = await storage.getFlashcardErrorsByDifficulty();
      res.json(errorsByDifficulty);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch flashcard errors by difficulty" });
    }
  });

  // Örnek kartları yükle
  app.post("/api/flashcards/seed", async (req, res) => {
    try {
      await storage.seedSampleFlashcards();
      res.json({ message: "Sample flashcards seeded successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to seed sample flashcards" });
    }
  });

  app.delete("/api/flashcards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFlashcard(id);

      if (!deleted) {
        return res.status(404).json({ message: "Flashcard not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete flashcard" });
    }
  });

  // Export API routes
  app.get("/api/export/json", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      const moods = await storage.getMoods();
      const dailySummary = await storage.getDailySummary(365); // Full year

      const exportData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        data: {
          tasks,
          moods,
          summary: dailySummary,
        },
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="yapilacaklar-yedegi-${new Date().toISOString().split("T")[0]}.json"`,
      );
      res.json(exportData);
    } catch (error) {
      console.error("JSON export error:", error);
      res.status(500).json({ message: "Export failed" });
    }
  });

  app.get("/api/export/csv", async (req, res) => {
    try {
      const tasks = await storage.getTasks();

      // CSV Header
      let csvContent =
        "ID,Başlık,Açıklama,Öncelik,Kategori,Renk,Tamamlandı,Tamamlanma Tarihi,Bitiş Tarihi,Oluşturulma Tarihi\n";

      // CSV Data
      tasks.forEach((task) => {
        const row = [
          task.id,
          `"${(task.title || "").replace(/"/g, '""')}"`, // Escape quotes
          `"${(task.description || "").replace(/"/g, '""')}"`,
          task.priority,
          task.category,
          task.color || "",
          task.completed ? "Evet" : "Hayır",
          task.completedAt || "",
          task.dueDate || "",
          task.createdAt
            ? new Date(task.createdAt).toLocaleDateString("tr-TR")
            : "",
        ].join(",");
        csvContent += row + "\n";
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="gorevler-${new Date().toISOString().split("T")[0]}.csv"`,
      );
      res.send("\uFEFF" + csvContent); // Add BOM for proper UTF-8 encoding
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ message: "Export failed" });
    }
  });
  */

  // Helper function to convert Turkish characters to ASCII equivalents for PDF
  const convertTurkishChars = (text: string): string => {
    if (!text || typeof text !== "string") return "";

    const turkishMap: { [key: string]: string } = {
      ç: "c",
      Ç: "C",
      ğ: "g",
      Ğ: "G",
      ı: "i",
      İ: "I",
      ö: "o",
      Ö: "O",
      ş: "s",
      Ş: "S",
      ü: "u",
      Ü: "U",
      // Additional characters that might cause issues
      â: "a",
      Â: "A",
      î: "i",
      Î: "I",
      û: "u",
      Û: "U",
    };

    // More comprehensive replacement including any potential Unicode variants
    return (
      text
        .replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, (match) => turkishMap[match] || match)
        // Extra safety: replace any remaining non-ASCII characters with safe equivalents
        .replace(/[^\x00-\x7F]/g, (match) => {
          // Log problematic characters for debugging
          console.warn(
            "Unconverted character in PDF:",
            match,
            match.charCodeAt(0),
          );
          return "?";
        })
    );
  };

  // PDF İçerik Oluşturma Fonksiyonu - Kompakt Tasarım
  const generatePDFContent = (doc: any, reportData: any) => {
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);
    
    const colors = {
      purple: '#8B5CF6',
      green: '#10B981', 
      red: '#EF4444',
      blue: '#3B82F6',
      dark: '#1E293B'
    };

    // Header - Atatürk'ün Sözü
    doc.fontSize(10)
       .fillColor(colors.dark)
       .font('Helvetica-Bold')
       .text('"Türk gençliği! Birinci vazifen; Türk istiklalini, Türk cumhuriyetini,', margin, 20, { align: 'center', width: contentWidth })
       .text('ilelebet muhafaza ve müdafaa etmektir." - Mustafa Kemal Atatürk', margin, 35, { align: 'center', width: contentWidth });

    // Başlık
    doc.rect(0, 60, pageWidth, 60).fill(colors.purple);
    doc.fontSize(18)
       .fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .text('Aylık Analiz Raporu', margin, 75, { align: 'center', width: contentWidth });
    
    doc.fontSize(12)
       .fillColor('#E5E7EB')
       .text(`${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Dönemi`, margin, 95, { align: 'center', width: contentWidth });

    let yPos = 140;

    // Ana İstatistikler - Kompakt Grid
    const stats = [
      { label: 'Toplam Soru', value: reportData.totalQuestions || 0, color: colors.purple },
      { label: 'Doğru', value: reportData.correctAnswers || 0, color: colors.green },
      { label: 'Yanlış', value: reportData.wrongAnswers || 0, color: colors.red },
      { label: 'Deneme', value: reportData.totalExams || 0, color: colors.blue }
    ];

    const cardW = (contentWidth - 30) / 2;
    const cardH = 45;

    stats.forEach((stat, index) => {
      const x = margin + (index % 2) * (cardW + 10);
      const y = yPos + Math.floor(index / 2) * (cardH + 10);
      
      doc.rect(x, y, cardW, cardH).fill(stat.color);
      doc.fontSize(20).fillColor('#FFFFFF').font('Helvetica-Bold')
         .text(stat.value.toString(), x + 10, y + 8);
      doc.fontSize(10).fillColor('#FFFFFF')
         .text(stat.label, x + 10, y + 28);
    });

    yPos += 110;

    // Performans Özeti - Tek Satır
    if (reportData.totalQuestions > 0) {
      const successRate = Math.round((reportData.correctAnswers / reportData.totalQuestions) * 100);
      doc.rect(margin, yPos, contentWidth, 30).fill('#F3F4F6');
      doc.fontSize(12).fillColor(colors.dark).font('Helvetica-Bold')
         .text(`Başarı Oranı: %${successRate} | Net: ${reportData.correctAnswers - (reportData.wrongAnswers * 0.25)} | Hedef: Yüksek Performans`, margin + 10, yPos + 10);
      yPos += 50;
    }

    // Tamamlanan Görevler - Kompakt
    if (reportData.totalTasks > 0) {
      doc.fontSize(12).fillColor(colors.green).font('Helvetica-Bold')
         .text('Tamamlanan Görevler', margin, yPos);
      yPos += 20;
      
      doc.rect(margin, yPos, contentWidth, 25).fill('#F0FDF4');
      doc.fontSize(10).fillColor(colors.green)
         .text(`Bu ay ${reportData.totalTasks} görev tamamlandı. Disiplinli çalışmanın meyvesini alıyorsun!`, margin + 10, yPos + 8);
      yPos += 40;
    }

    // Alt Bilgi
    doc.fontSize(8).fillColor('#9CA3AF')
       .text('Bu rapor otomatik olarak oluşturulmuştur - Berat Çakıroğlu Analiz Sistemi', margin, pageHeight - 40, { align: 'center', width: contentWidth })
       .text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`, margin, pageHeight - 25, { align: 'center', width: contentWidth });
  };

  // PDF Download Endpoint - Kullanıcı PDF'i görebilsin
  app.get("/api/download-report", async (req, res) => {
    try {
      const reportData = {
        totalQuestions: 52,
        correctAnswers: 43,
        wrongAnswers: 9,
        totalExams: 2,
        totalTasks: 1,
        totalActivities: 4
      };

      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      
      // PDF içeriği oluştur
      generatePDFContent(doc, reportData);
      
      // Response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Berat_Cakiroglu_Rapor.pdf"');
      
      // PDF stream'ini response'a pipe et
      doc.pipe(res);
      doc.end();
      
    } catch (error) {
      console.error('PDF download error:', error);
      res.status(500).json({ message: "PDF oluşturulurken hata oluştu" });
    }
  });

  // PDF Report Email Endpoint - Enhanced implementation with validation
  app.post("/api/send-report", async (req, res) => {
    try {
      const { email, phone, reportData } = req.body;
      
      if (!email || !reportData) {
        return res.status(400).json({ message: "Email ve rapor verisi gerekli" });
      }

      // Email format validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Geçerli bir email adresi giriniz" });
      }

      // Test email addresses'i engelle
      const testDomains = ['example.com', 'test.com', 'fake.com', 'dummy.com'];
      const emailDomain = email.split('@')[1].toLowerCase();
      if (testDomains.includes(emailDomain)) {
        return res.status(400).json({ message: "Lütfen gerçek bir email adresi kullanın" });
      }

      // PDF oluştur - PDFKit kullanarak
      const doc = new PDFKit({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: 'Aylık Aktivite Raporu',
          Author: 'Berat Çakıroğlu Ders Analiz Sistemi',
          Subject: 'Aylık Çalışma Performans Raporu'
        }
      });

      // Türkçe karakter desteği için font yükle
      try {
        // PDFKit ile gömülü font kullanarak Türkçe karakter desteği
        // Eğer özel font yoksa, built-in Helvetica kullanacak
        doc.registerFont('DefaultFont', 'Helvetica');
      } catch (error) {
        console.warn('Font loading warning:', error.message);
      }

      // PDF buffer'ını oluştur
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      
      await new Promise<void>((resolve) => {
        doc.on('end', resolve);
        
        // PDF içeriği oluştur
        generatePDFContent(doc, reportData);
        doc.end();
      });

      const pdfBuffer = Buffer.concat(buffers);

      // E-posta gönderimi
      
      // Gmail SMTP konfigürasyonu - İyileştirilmiş
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || process.env.GMAIL_USER,
          pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // E-posta ayarları
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: `📊 Aylık Aktivite Raporu - ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px;">
            
            <!-- Atatürk'ün Sözü - En Üst -->
            <div style="background: rgba(255, 255, 255, 0.95); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center; border-left: 6px solid #E53E3E;">
              <p style="color: #1E293B; margin: 0; font-size: 14px; font-weight: 600; line-height: 1.6; font-style: italic;">
                "Türk gençliği! Birinci vazifen; Türk istiklalini, Türk cumhuriyetini, ilelebet muhafaza ve müdafaa etmektir."
              </p>
              <p style="color: #64748B; margin: 8px 0 0 0; font-size: 12px; font-weight: bold;">
                - Mustafa Kemal Atatürk
              </p>
            </div>

            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);">
              
              <!-- Başlık Kısmı -->
              <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8B5CF6; padding-bottom: 20px;">
                <h1 style="color: #8B5CF6; margin: 0; font-size: 28px; font-weight: bold; margin-bottom: 8px;">
                  📊 Aylık Analiz Raporu
                </h1>
                <p style="color: #64748B; margin: 0; font-size: 16px; font-weight: 500;">
                  ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Dönemi - Berat Çakıroğlu
                </p>
                <p style="color: #9CA3AF; margin: 5px 0 0 0; font-size: 12px;">
                  Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}
                </p>
              </div>

              <!-- Karta Motivasyon Mesajı -->
              <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px; text-align: center; border: 2px solid #F59E0B;">
                <h3 style="color: #92400E; margin: 0 0 10px 0; font-size: 18px;">🎆 Tebrikler!</h3>
                <p style="color: #A16207; margin: 0; font-size: 14px; line-height: 1.6; font-weight: 500;">
                  Bu ay boyunca ders çalışma aktivitelerinizin detaylı analizi ekte yer almaktadır. 
                  Her adımınız hedeflerinize ulaşmanızda önemli bir progress!
                </p>
              </div>

              <!-- İstatistik Kartları -->
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
                <div style="background: linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%); padding: 18px; border-radius: 10px; text-align: center; border: 2px solid #8B5CF6;">
                  <div style="font-size: 32px; font-weight: bold; color: #5B21B6; margin-bottom: 5px;">${reportData.totalTasks || 0}</div>
                  <div style="font-size: 13px; color: #6D28D9; font-weight: 700;">Tamamlanan Görev</div>
                </div>
                <div style="background: linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%); padding: 18px; border-radius: 10px; text-align: center; border: 2px solid #10B981;">
                  <div style="font-size: 32px; font-weight: bold; color: #065F46; margin-bottom: 5px;">${reportData.totalQuestions || 0}</div>
                  <div style="font-size: 13px; color: #047857; font-weight: 700;">Çözülen Soru</div>
                </div>
                <div style="background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); padding: 18px; border-radius: 10px; text-align: center; border: 2px solid #EF4444;">
                  <div style="font-size: 32px; font-weight: bold; color: #991B1B; margin-bottom: 5px;">${reportData.totalExams || 0}</div>
                  <div style="font-size: 13px; color: #B91C1C; font-weight: 700;">Deneme Sınavı</div>
                </div>
                <div style="background: linear-gradient(135deg, #FFF7ED 0%, #FDEDD3 100%); padding: 18px; border-radius: 10px; text-align: center; border: 2px solid #F59E0B;">
                  <div style="font-size: 32px; font-weight: bold; color: #92400E; margin-bottom: 5px;">${reportData.totalActivities || 0}</div>
                  <div style="font-size: 13px; color: #A16207; font-weight: 700;">Toplam Aktivite</div>
                </div>
              </div>

              <!-- Performans Özeti -->
              <div style="background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px; border: 2px solid #8B5CF6;">
                <h3 style="color: #7C3AED; margin: 0 0 15px 0; font-size: 20px; font-weight: bold;">🎯 Bu Ayın Performansı</h3>
                <p style="color: #8B5CF6; margin: 0; font-size: 16px; font-weight: 600; line-height: 1.5;">
                  Toplam ${reportData.totalActivities || 0} aktivite ile harika bir performans serglediniz!<br>
                  <span style="font-size: 14px; color: #9333EA;">Çalışma disiplininiz takdire şayan. Böyle devam! 🚀</span>
                </p>
              </div>

              <!-- Alt Bilgi -->
              <div style="border-top: 3px solid #E5E7EB; padding-top: 20px; text-align: center;">
                <p style="color: #6B7280; margin: 0 0 10px 0; font-size: 13px; font-weight: 500;">
                  📧 Bu rapor Berat Çakıroğlu Analiz Sistemi tarafından otomatik oluşturulmuştur
                </p>
                <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
                  📱 İletişim: ${phone || 'Belirtilmemiş'} | 📋 PDF rapor detaylı analizi içerir
                </p>
              </div>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `aktivite-raporu-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // E-postayı gönder
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
          const info = await transporter.sendMail(mailOptions);
          console.log('Email sent successfully:', info.messageId);
          res.json({ message: "Rapor başarıyla e-posta adresinize gönderildi!" });
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          
          // Email hatasının türüne göre farklı mesajlar
          if (emailError.code === 'ENOTFOUND' || emailError.code === 'ECONNECTION') {
            res.status(500).json({ message: "Email servisi ile bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol edin." });
          } else if (emailError.responseCode === 550) {
            res.status(400).json({ message: "Email adresi bulunamadı veya geçersiz. Lütfen doğru email adresini kontrol edin." });
          } else if (emailError.responseCode === 535) {
            res.status(500).json({ message: "Email kimlik doğrulama hatası. Sistem yöneticisine başvurun." });
          } else {
            res.status(500).json({ message: `Email gönderiminde hata: ${emailError.message}` });
          }
        }
      } else {
        // E-posta kimlik bilgileri yoksa sadece PDF oluştur ve başarı mesajı döndür
        res.json({ message: "PDF raporu oluşturuldu! (E-posta ayarları yapılandırılmamış)" });
      }

    } catch (error) {
      console.error('PDF/Email error:', error);
      res.status(500).json({ message: "Rapor gönderilirken hata oluştu: " + error.message });
    }
  });

  // Test e-posta gönderimi - Farklı senaryolar için test endpoint'i
  app.post("/api/test-emails", async (req, res) => {
    try {
      const { email, testType } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email gerekli" });
      }

      // Email format validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Geçerli bir email adresi giriniz" });
      }

      // Test senaryoları için farklı veri setleri
      const testScenarios = {
        soru_eklendi: {
          subject: "🎯 Yeni Sorular Eklendi - Test",
          reportData: {
            totalQuestions: 25,
            correctAnswers: 20,
            wrongAnswers: 5,
            totalExams: 1,
            totalTasks: 3,
            totalActivities: 7
          }
        },
        deneme_tamamlandi: {
          subject: "📝 Deneme Sınavı Tamamlandı - Test",
          reportData: {
            totalQuestions: 120,
            correctAnswers: 85,
            wrongAnswers: 35,
            totalExams: 5,
            totalTasks: 8,
            totalActivities: 15
          }
        },
        hatali_konular: {
          subject: "⚠️ Hatalı Konular Analizi - Test",
          reportData: {
            totalQuestions: 50,
            correctAnswers: 30,
            wrongAnswers: 20,
            totalExams: 2,
            totalTasks: 5,
            totalActivities: 9
          }
        },
        gorev_eklendi: {
          subject: "✅ Yeni Görevler Eklendi - Test",
          reportData: {
            totalQuestions: 15,
            correctAnswers: 12,
            wrongAnswers: 3,
            totalExams: 1,
            totalTasks: 12,
            totalActivities: 20
          }
        },
        gorev_tamamlandi: {
          subject: "🎉 Görevler Tamamlandı - Test",
          reportData: {
            totalQuestions: 40,
            correctAnswers: 35,
            wrongAnswers: 5,
            totalExams: 3,
            totalTasks: 15,
            totalActivities: 25
          }
        },
        aylik_ozet: {
          subject: "📊 Aylık Özet Raporu - Test",
          reportData: {
            totalQuestions: 200,
            correctAnswers: 160,
            wrongAnswers: 40,
            totalExams: 8,
            totalTasks: 25,
            totalActivities: 50
          }
        }
      };

      const scenario = testScenarios[testType] || testScenarios.aylik_ozet;
      
      // PDF oluştur
      const doc = new PDFKit({
        size: 'A4',
        margin: 40,
        bufferPages: true
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        
        // Gmail SMTP konfigürasyonu
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || process.env.GMAIL_USER,
            pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        // Test e-posta ayarları
        const mailOptions = {
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: email,
          subject: scenario.subject,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px;">
              
              <!-- Atatürk'ün Sözü - En Üst -->
              <div style="background: rgba(255, 255, 255, 0.95); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center; border-left: 6px solid #E53E3E;">
                <p style="color: #1E293B; margin: 0; font-size: 14px; font-weight: 600; line-height: 1.6; font-style: italic;">
                  "Türk gençliği! Birinci vazifen; Türk istiklalini, Türk cumhuriyetini, ilelebet muhafaza ve müdafaa etmektir."
                </p>
                <p style="color: #64748B; margin: 8px 0 0 0; font-size: 12px; font-weight: bold;">
                  - Mustafa Kemal Atatürk
                </p>
              </div>

              <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);">
                
                <!-- Test Mesajı -->
                <div style="background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px; text-align: center; border: 2px solid #EF4444;">
                  <h3 style="color: #991B1B; margin: 0 0 10px 0; font-size: 18px;">🧪 TEST E-POSTASI</h3>
                  <p style="color: #B91C1C; margin: 0; font-size: 14px; line-height: 1.6; font-weight: 500;">
                    Bu bir test e-postasıdır. Test türü: <strong>${testType || 'aylik_ozet'}</strong><br>
                    ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')} tarihinde gönderildi.
                  </p>
                </div>
                
                <!-- Başlık Kısmı -->
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8B5CF6; padding-bottom: 20px;">
                  <h1 style="color: #8B5CF6; margin: 0; font-size: 28px; font-weight: bold; margin-bottom: 8px;">
                    📊 Test Raporu
                  </h1>
                  <p style="color: #64748B; margin: 0; font-size: 16px; font-weight: 500;">
                    ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Dönemi - Berat Çakıroğlu
                  </p>
                  <p style="color: #9CA3AF; margin: 5px 0 0 0; font-size: 12px;">
                    Test Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}
                  </p>
                </div>

                <!-- İstatistik Kartları -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
                  <div style="background: linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%); padding: 18px; border-radius: 10px; text-align: center; border: 2px solid #8B5CF6;">
                    <div style="font-size: 32px; font-weight: bold; color: #5B21B6; margin-bottom: 5px;">${scenario.reportData.totalTasks}</div>
                    <div style="font-size: 13px; color: #6D28D9; font-weight: 700;">Test Görevler</div>
                  </div>
                  <div style="background: linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%); padding: 18px; border-radius: 10px; text-align: center; border: 2px solid #10B981;">
                    <div style="font-size: 32px; font-weight: bold; color: #065F46; margin-bottom: 5px;">${scenario.reportData.totalQuestions}</div>
                    <div style="font-size: 13px; color: #047857; font-weight: 700;">Test Sorular</div>
                  </div>
                  <div style="background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); padding: 18px; border-radius: 10px; text-align: center; border: 2px solid #EF4444;">
                    <div style="font-size: 32px; font-weight: bold; color: #991B1B; margin-bottom: 5px;">${scenario.reportData.totalExams}</div>
                    <div style="font-size: 13px; color: #B91C1C; font-weight: 700;">Test Denemeler</div>
                  </div>
                  <div style="background: linear-gradient(135deg, #FFF7ED 0%, #FDEDD3 100%); padding: 18px; border-radius: 10px; text-align: center; border: 2px solid #F59E0B;">
                    <div style="font-size: 32px; font-weight: bold; color: #92400E; margin-bottom: 5px;">${scenario.reportData.totalActivities}</div>
                    <div style="font-size: 13px; color: #A16207; font-weight: 700;">Test Aktiviteler</div>
                  </div>
                </div>

                <!-- Test Bilgisi -->
                <div style="background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px; border: 2px solid #8B5CF6;">
                  <h3 style="color: #7C3AED; margin: 0 0 15px 0; font-size: 20px; font-weight: bold;">🎯 Test Başarılı!</h3>
                  <p style="color: #8B5CF6; margin: 0; font-size: 16px; font-weight: 600; line-height: 1.5;">
                    E-posta sistemi çalışıyor! Test verileri ile ${scenario.reportData.totalActivities} aktivite simüle edildi.<br>
                    <span style="font-size: 14px; color: #9333EA;">Gmail SMTP entegrasyonu başarılı! 🚀</span>
                  </p>
                </div>

                <!-- Alt Bilgi -->
                <div style="border-top: 3px solid #E5E7EB; padding-top: 20px; text-align: center;">
                  <p style="color: #6B7280; margin: 0 0 10px 0; font-size: 13px; font-weight: 500;">
                    📧 Bu test e-postası Berat Çakıroğlu Analiz Sistemi tarafından gönderildi
                  </p>
                  <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
                    📱 Test türü: ${testType || 'aylik_ozet'} | 📋 PDF test raporu ekte
                  </p>
                </div>
              </div>
            </div>
          `,
          attachments: [{
            filename: `test-raporu-${testType || 'aylik_ozet'}-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        };

        // E-postayı gönder
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          transporter.sendMail(mailOptions)
            .then(() => {
              res.json({ 
                message: `Test e-postası başarıyla gönderildi! Test türü: ${testType || 'aylik_ozet'}`,
                testType: testType || 'aylik_ozet',
                emailSent: true
              });
            })
            .catch((emailError) => {
              console.error('Test email gönderim hatası:', emailError);
              res.status(500).json({ 
                message: `Test e-posta gönderiminde hata: ${emailError.message}`,
                testType: testType || 'aylik_ozet',
                emailSent: false
              });
            });
        } else {
          res.json({ 
            message: "E-posta kimlik bilgileri yapılandırılmamış - Test PDF oluşturuldu",
            testType: testType || 'aylik_ozet',
            emailSent: false
          });
        }
      });

      // PDF içeriği oluştur
      generatePDFContent(doc, scenario.reportData);
      doc.end();
      
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ message: "Test e-posta gönderiminde hata oluştu" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
