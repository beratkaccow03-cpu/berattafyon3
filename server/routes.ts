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
import fs from "fs";
import path from "path";
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
        tytNets =
          (parseFloat(tyt.turkce) || 0) +
          (parseFloat(tyt.sosyal) || 0) +
          (parseFloat(tyt.matematik) || 0) +
          (parseFloat(tyt.fen) || 0);
      }

      // AYT neti hesaplama
      if (nets?.ayt) {
        const ayt = nets.ayt;
        aytNets =
          (parseFloat(ayt.matematik) || 0) +
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
      const totalScore =
        tytScore * yearData.tytWeight + aytScore * yearData.aytWeight;

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
          
          // API başarısız olursa (geçersiz anahtar vs) statik veri kullan
          if (!currentData || !currentData.main || currentData.cod === 401 || currentData.cod === '401') {
            console.log("Weather API key is invalid, using static data");
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
          } else {
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
          }
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
    const contentWidth = pageWidth - margin * 2;

    const colors = {
      turkishRed: "#E30A17",
      turkishFlag: "#C8102E",
      primary: "#8B5CF6",
      secondary: "#6366F1",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      text: "#111827",
      muted: "#6B7280",
      gold: "#FFD700",
      white: "#FFFFFF",
    };

    // SAYFA 1: Kapak ve Atatürk Sözü
    // Türk Bayrağı (sol üst)
    doc.rect(margin, 15, 50, 30).fill(colors.turkishRed);
    doc.circle(margin + 16, 30, 6).fill(colors.white);
    // Hilal ve yıldız (basitleştirilmiş)
    doc
      .moveTo(margin + 20, 25)
      .lineTo(margin + 26, 30)
      .lineTo(margin + 20, 35)
      .fill(colors.white);

    // Türk Bayrağı (sağ üst)
    doc.rect(pageWidth - margin - 50, 15, 50, 30).fill(colors.turkishRed);
    doc.circle(pageWidth - margin - 34, 30, 6).fill(colors.white);
    doc
      .moveTo(pageWidth - margin - 30, 25)
      .lineTo(pageWidth - margin - 24, 30)
      .lineTo(pageWidth - margin - 30, 35)
      .fill(colors.white);

    let yPos = 80;

    // Atatürk Sözü - Büyük, Kalın, İtalik (İsteğiniz üzere)
    doc
      .fontSize(16)
      .fillColor(colors.text)
      .font("Helvetica-BoldOblique")
      .text(
        '"Biz her şeyi gençliğe bırakacağız... Geleceğin ümidi,',
        margin,
        yPos,
        { align: "center", width: contentWidth },
      );

    yPos += 22;
    doc.text(
      'ışıklı çiçekleri onlardır. Bütün ümidim gençliktedir."',
      margin,
      yPos,
      { align: "center", width: contentWidth },
    );

    yPos += 30;
    doc
      .fontSize(12)
      .fillColor(colors.muted)
      .font("Helvetica-Oblique")
      .text("- Mustafa Kemal Atatürk -", margin, yPos, {
        align: "center",
        width: contentWidth,
      });

    yPos += 60;

    // Ana Başlık
    doc
      .fontSize(24)
      .fillColor(colors.primary)
      .font("Helvetica-Bold")
      .text("🎓 BERAT ÇAKIROĞLU", margin, yPos, {
        align: "center",
        width: contentWidth,
      });

    yPos += 30;
    doc
      .fontSize(18)
      .fillColor(colors.turkishRed)
      .text("KİŞİSEL ÇALIŞMA ANALİZ RAPORU", margin, yPos, {
        align: "center",
        width: contentWidth,
      });

    yPos += 40;
    // Tarih bilgisi
    const currentDate = new Date();
    doc
      .fontSize(12)
      .fillColor(colors.muted)
      .font("Helvetica")
      .text(
        `📅 Rapor Tarihi: ${currentDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}`,
        margin,
        yPos,
        { align: "center", width: contentWidth },
      );

    yPos += 18;
    doc.text(
      `📊 Analiz Dönemi: ${reportData.month || "Bu Ay"} | 🎯 Toplam ${reportData.totalActivities || 0} Aktivite`,
      margin,
      yPos,
      { align: "center", width: contentWidth },
    );

    yPos += 50;

    // Motivasyonel Başarı Bölümü
    doc
      .fontSize(14)
      .fillColor(colors.success)
      .font("Helvetica-Bold")
      .text("🌟 BAŞARILARINIZ", margin, yPos, {
        align: "center",
        width: contentWidth,
      });

    yPos += 25;
    const achievements = [];
    if (reportData.totalQuestions > 50)
      achievements.push(
        `${reportData.totalQuestions} soru ile mükemmel çalışma temposu`,
      );
    if (reportData.correctAnswers > reportData.wrongAnswers)
      achievements.push(`Doğru cevaplarınız yanlışlarınızdan fazla!`);
    if (reportData.totalTasks > 10)
      achievements.push(
        `${reportData.totalTasks} görevi başarıyla tamamladınız`,
      );
    if (reportData.totalExams > 3)
      achievements.push(
        `${reportData.totalExams} deneme ile kendinizi test ettiniz`,
      );

    if (achievements.length === 0)
      achievements.push("Her çalışma sizi hedefinize yaklaştırıyor!");

    achievements.slice(0, 4).forEach((achievement) => {
      doc
        .fontSize(10)
        .fillColor(colors.text)
        .font("Helvetica")
        .text(`✓ ${achievement}`, margin + 15, yPos);
      yPos += 20;
    });

    // SAYFA 2: İstatistikler
    doc.addPage();
    yPos = margin;

    doc
      .fontSize(20)
      .fillColor(colors.primary)
      .font("Helvetica-Bold")
      .text("📊 DETAYLI İSTATİSTİKLER", margin, yPos, {
        align: "center",
        width: contentWidth,
      });

    yPos += 50;

    const statsData = [
      {
        label: "Toplam Soru",
        value: reportData.totalQuestions || 0,
        color: colors.primary,
        icon: "📚",
      },
      {
        label: "Doğru Cevap",
        value: reportData.correctAnswers || 0,
        color: colors.success,
        icon: "✅",
      },
      {
        label: "Yanlış Cevap",
        value: reportData.wrongAnswers || 0,
        color: colors.error,
        icon: "❌",
      },
      {
        label: "Deneme Sınavı",
        value: reportData.totalExams || 0,
        color: colors.secondary,
        icon: "📝",
      },
      {
        label: "Tamamlanan Görev",
        value: reportData.totalTasks || 0,
        color: colors.warning,
        icon: "✓",
      },
      {
        label: "Toplam Aktivite",
        value: reportData.totalActivities || 0,
        color: colors.gold,
        icon: "⭐",
      },
    ];

    // 2x3 düzeninde kartlar
    const cardWidth = (contentWidth - 20) / 2;
    const cardHeight = 70;
    let cardX = margin,
      cardY = yPos;

    statsData.forEach((stat, index) => {
      if (index % 2 === 0 && index > 0) {
        cardY += cardHeight + 20;
        cardX = margin;
      }

      // Geliştirilmiş kart tasarımı
      doc
        .rect(cardX, cardY, cardWidth, cardHeight)
        .fillAndStroke("#F8F9FA", colors.muted + "40");

      // İkon ve değer
      doc
        .fontSize(12)
        .fillColor(stat.color)
        .text(stat.icon, cardX + 12, cardY + 12);
      doc
        .fontSize(24)
        .fillColor(stat.color)
        .font("Helvetica-Bold")
        .text(stat.value.toString(), cardX + 35, cardY + 8);
      doc
        .fontSize(10)
        .fillColor(colors.text)
        .font("Helvetica")
        .text(stat.label, cardX + 12, cardY + 45);

      cardX += cardWidth + 20;
    });

    yPos = cardY + cardHeight + 40;

    // Performans Analizi
    if (reportData.totalQuestions > 0) {
      const successRate = Math.round(
        (reportData.correctAnswers / reportData.totalQuestions) * 100,
      );
      const netScore =
        reportData.correctAnswers - reportData.wrongAnswers * 0.25;

      doc
        .fontSize(16)
        .fillColor(colors.success)
        .font("Helvetica-Bold")
        .text("🎯 PERFORMANS ANALİZİ", margin, yPos);

      yPos += 30;
      doc
        .fontSize(12)
        .fillColor(colors.text)
        .font("Helvetica")
        .text(`📈 Başarı Oranınız: %${successRate}`, margin + 15, yPos);

      yPos += 20;
      doc.text(`🎯 Net Puanınız: ${netScore.toFixed(2)}`, margin + 15, yPos);

      yPos += 25;
      let performanceMsg = "";
      if (successRate >= 80)
        performanceMsg = "Mükemmel! Hedeflerinize çok yakınsınız! 🌟";
      else if (successRate >= 60)
        performanceMsg =
          "Harika! Biraz daha çalışmayla hedefe ulaşacaksınız! 💪";
      else if (successRate >= 40)
        performanceMsg =
          "İyi başlangıç! Daha fazla çalışmayla başarıya ulaşabilirsiniz! 📚";
      else
        performanceMsg =
          "Her başarı hikayesi bir yerden başlar! Devam edin! 🚀";

      doc
        .fontSize(11)
        .fillColor(colors.primary)
        .text(performanceMsg, margin + 15, yPos);
    }

    // SAYFA 3: Detaylı Aktiviteler
    if (
      reportData.tasks?.length > 0 ||
      reportData.questionLogs?.length > 0 ||
      reportData.examResults?.length > 0
    ) {
      doc.addPage();
      yPos = margin;

      doc
        .fontSize(18)
        .fillColor(colors.primary)
        .font("Helvetica-Bold")
        .text("📋 DETAYLI AKTİVİTE RAPORU", margin, yPos);

      yPos += 35;

      // Tamamlanan Görevler
      if (reportData.tasks?.length > 0) {
        doc
          .fontSize(14)
          .fillColor(colors.warning)
          .font("Helvetica-Bold")
          .text("✅ Tamamlanan Görevler:", margin, yPos);

        yPos += 22;
        reportData.tasks.slice(0, 8).forEach((task: any, index: number) => {
          const categoryText = getCategoryText(task.category || "genel");
          doc
            .fontSize(10)
            .fillColor(colors.text)
            .font("Helvetica")
            .text(
              `${index + 1}. ${task.title || "Görev"} - ${categoryText}`,
              margin + 15,
              yPos,
            );
          yPos += 16;
        });
        yPos += 15;
      }

      // Soru Çözüm Detayları
      if (reportData.questionLogs?.length > 0) {
        doc
          .fontSize(14)
          .fillColor(colors.secondary)
          .font("Helvetica-Bold")
          .text("📚 Soru Çözüm Detayları:", margin, yPos);

        yPos += 22;
        reportData.questionLogs
          .slice(0, 6)
          .forEach((log: any, index: number) => {
            doc
              .fontSize(10)
              .fillColor(colors.text)
              .font("Helvetica")
              .text(
                `${index + 1}. ${log.exam_type} ${log.subject}: ${log.correct_count}D/${log.wrong_count}Y/${log.blank_count}B - ${log.study_date}`,
                margin + 15,
                yPos,
              );
            yPos += 16;
          });
        yPos += 15;
      }

      // Deneme Sonuçları
      if (reportData.examResults?.length > 0) {
        doc
          .fontSize(14)
          .fillColor(colors.error)
          .font("Helvetica-Bold")
          .text("🎯 Deneme Sınavı Sonuçları:", margin, yPos);

        yPos += 22;
        reportData.examResults
          .slice(0, 4)
          .forEach((exam: any, index: number) => {
            doc
              .fontSize(10)
              .fillColor(colors.text)
              .font("Helvetica")
              .text(
                `${index + 1}. ${exam.exam_name}: TYT ${exam.tyt_net}net, AYT ${exam.ayt_net}net - ${exam.exam_date}`,
                margin + 15,
                yPos,
              );
            yPos += 16;
          });
      }
    }

    // SAYFA 4: Son Mesaj ve İletişim
    doc.addPage();
    yPos = margin + 80;

    doc
      .fontSize(18)
      .fillColor(colors.success)
      .font("Helvetica-Bold")
      .text("🌟 BU AY HARİKA BİR ÇALIŞMA SERGİLEDİNİZ!", margin, yPos, {
        align: "center",
        width: contentWidth,
      });

    yPos += 50;
    doc
      .fontSize(12)
      .fillColor(colors.text)
      .font("Helvetica")
      .text(
        "Hedefinize doğru ilerliyor, her gün kendinizi geliştiriyorsunuz.",
        margin,
        yPos,
        { align: "center", width: contentWidth },
      );

    yPos += 20;
    doc.text(
      "Bu rapor sadece bir özet, asıl başarı sizin azminizde gizli.",
      margin,
      yPos,
      { align: "center", width: contentWidth },
    );

    yPos += 20;
    doc.text(
      "Her soru, her görev sizi hayalinizdeki üniversiteye yaklaştırıyor!",
      margin,
      yPos,
      { align: "center", width: contentWidth },
    );

    // Alt bilgi
    yPos = pageHeight - 60;
    doc
      .fontSize(9)
      .fillColor(colors.muted)
      .text(
        `Bu rapor ${new Date().toLocaleDateString("tr-TR")} tarihinde otomatik oluşturulmuştur.`,
        margin,
        yPos,
        { align: "center", width: contentWidth },
      );

    yPos += 15;
    doc.text(
      "🇹🇷 Berat Çakıroğlu Kişisel Analiz Sistemi - Geleceğe Yatırım 🇹🇷",
      margin,
      yPos,
      { align: "center", width: contentWidth },
    );
  };

  // Kategori metinlerini düzgün göstermek için yardımcı fonksiyon
  const getCategoryText = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      genel: "Genel",
      turkce: "Türkçe",
      sosyal: "Sosyal Bilimler",
      matematik: "Matematik",
      fizik: "Fizik",
      kimya: "Kimya",
      biyoloji: "Biyoloji",
      "tyt-geometri": "TYT Geometri",
      "ayt-geometri": "AYT Geometri",
      "ayt-matematik": "AYT Matematik",
      "ayt-fizik": "AYT Fizik",
      "ayt-kimya": "AYT Kimya",
      "ayt-biyoloji": "AYT Biyoloji",
    };
    return categoryMap[category] || category;
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
        totalActivities: 4,
      };

      const PDFDocument = PDFKit;
      const doc = new PDFDocument({ size: "A4", margin: 50 });

      // PDF içeriği oluştur
      generatePDFContent(doc, reportData);

      // Response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="Berat_Cakiroglu_Rapor.pdf"',
      );

      // PDF stream'ini response'a pipe et
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("PDF download error:", error);
      res.status(500).json({ message: "PDF oluşturulurken hata oluştu" });
    }
  });

  // Email Report Endpoint - Modern HTML email with embedded images
  app.post("/api/send-report", async (req, res) => {
    try {
      // Fetch REAL data from storage
      const tasks = await storage.getTasks();
      const questionLogs = await storage.getQuestionLogs();
      const examResults = await storage.getExamResults();
      const completedTasks = tasks.filter(task => task.completed);
      
      // Calculate statistics
      let totalQuestions = 0;
      let correctAnswers = 0;
      let wrongAnswers = 0;
      let blankAnswers = 0;
      
      // Subject-level statistics
      const subjectStats: any = {};
      const wrongTopicsMap: Map<string, { count: number; subject: string }> = new Map();
      const correctTopicsMap: Map<string, { count: number; subject: string }> = new Map();
      const dateStats: Map<string, number> = new Map();
      
      questionLogs.forEach(log => {
        const correct = parseInt(log.correct_count) || 0;
        const wrong = parseInt(log.wrong_count) || 0;
        const blank = parseInt(log.blank_count) || 0;
        
        totalQuestions += correct + wrong + blank;
        correctAnswers += correct;
        wrongAnswers += wrong;
        blankAnswers += blank;
        
        // Per subject stats
        if (!subjectStats[log.subject]) {
          subjectStats[log.subject] = { correct: 0, wrong: 0, blank: 0, total: 0, topicsCorrect: new Map(), topicsWrong: new Map() };
        }
        subjectStats[log.subject].correct += correct;
        subjectStats[log.subject].wrong += wrong;
        subjectStats[log.subject].blank += blank;
        subjectStats[log.subject].total += correct + wrong + blank;
        
        // Date tracking - en çok soru çözülen tarih
        const date = log.study_date;
        dateStats.set(date, (dateStats.get(date) || 0) + (correct + wrong + blank));
        
        // Wrong topics tracking
        if (log.wrong_topics && log.wrong_topics.length > 0) {
          log.wrong_topics.forEach(topic => {
            const existing = wrongTopicsMap.get(topic);
            if (existing) {
              existing.count++;
            } else {
              wrongTopicsMap.set(topic, { count: 1, subject: log.subject });
            }
            
            // Subject-level wrong topics
            const subjectWrongTopics = subjectStats[log.subject].topicsWrong;
            subjectWrongTopics.set(topic, (subjectWrongTopics.get(topic) || 0) + 1);
          });
        }
        
        // Correct topics tracking from wrong_topics_json
        if (log.wrong_topics_json) {
          try {
            const topicsData = JSON.parse(log.wrong_topics_json);
            if (Array.isArray(topicsData)) {
              topicsData.forEach((topicItem: any) => {
                if (topicItem.topic) {
                  // Doğru yapılan konular için - wrong_topics_json'da olanlar yanlış, olmayanlar doğru
                  // Bu karmaşık, basit bir yaklaşım: correct sayısına göre en çok doğru yapılan konuları tespit et
                }
              });
            }
          } catch (e) {
            // JSON parse hatası
          }
        }
      });
      
      // Prepare exam details with subjects and wrong topics
      const examDetailsWithSubjects = await Promise.all(
        examResults.map(async (exam) => {
          const subjects = await storage.getExamSubjectNetsByExamId(exam.id);
          return {
            ...exam,
            subjects: subjects.map(sub => {
              let wrongTopicsArray = [];
              if (sub.wrong_topics_json) {
                try {
                  const parsedTopics = JSON.parse(sub.wrong_topics_json);
                  if (Array.isArray(parsedTopics)) {
                    wrongTopicsArray = parsedTopics.map((t: any) => t.topic || t).filter(Boolean);
                  }
                } catch (e) {
                  // JSON parse error, keep empty array
                }
              }
              
              return {
                subject: sub.subject,
                net_score: sub.net_score,
                correct_count: sub.correct_count,
                wrong_count: sub.wrong_count,
                blank_count: sub.blank_count,
                wrong_topics: wrongTopicsArray
              };
            })
          };
        })
      );
      
      // Calculate max TYT and AYT nets
      const maxTytNet = Math.max(...examResults.map(e => parseFloat(e.tyt_net) || 0), 0);
      const maxAytNet = Math.max(...examResults.map(e => parseFloat(e.ayt_net) || 0), 0);
      
      // Most solved subjects (top 3)
      const mostSolvedSubjects = Object.entries(subjectStats)
        .sort((a: any, b: any) => b[1].total - a[1].total)
        .slice(0, 3)
        .map(([name, stats]: any) => ({ name, count: stats.total }));
      
      // Most correct subjects (top 3)
      const mostCorrectSubjects = Object.entries(subjectStats)
        .sort((a: any, b: any) => b[1].correct - a[1].correct)
        .slice(0, 3)
        .map(([name, stats]: any) => ({ name, count: stats.correct }));
      
      // Most wrong subjects (top 3)
      const mostWrongSubjects = Object.entries(subjectStats)
        .sort((a: any, b: any) => b[1].wrong - a[1].wrong)
        .slice(0, 3)
        .map(([name, stats]: any) => ({ name, count: stats.wrong }));
      
      // Frequent wrong topics (minimum 3 yanlış filtresi)
      const frequentWrongTopics = Array.from(wrongTopicsMap.entries())
        .map(([topic, data]) => ({ topic, count: data.count, subject: data.subject }))
        .filter(item => item.count >= 3)
        .sort((a, b) => b.count - a.count);
      
      // En çok soru çözülen tarih
      let mostActiveDate = null;
      let maxQuestionsInDay = 0;
      for (const [date, count] of dateStats.entries()) {
        if (count > maxQuestionsInDay) {
          maxQuestionsInDay = count;
          mostActiveDate = date;
        }
      }
      
      // En çok doğru yapılan konular (subjectStats'dan)
      const mostCorrectTopics: any[] = [];
      Object.entries(subjectStats).forEach(([subject, stats]: any) => {
        Object.entries(subjectStats).forEach(([subj, s]: any) => {
          // Basitleştirilmiş: en çok doğru yapılan derslerin konuları
          if (s.correct > 0) {
            mostCorrectTopics.push({ subject: subj, correctCount: s.correct });
          }
        });
      });
      mostCorrectTopics.sort((a, b) => b.correctCount - a.correctCount);
      
      const reportData = {
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        blankAnswers,
        totalExams: examResults.length,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        totalActivities: questionLogs.length + examResults.length + completedTasks.length,
        tyt_net: maxTytNet,
        ayt_net: maxAytNet,
        maxTytNet,
        maxAytNet,
        mostSolvedSubjects,
        mostCorrectSubjects,
        mostWrongSubjects,
        frequentWrongTopics,
        examDetailsWithSubjects,
        mostActiveDate,
        maxQuestionsInDay,
        mostCorrectTopics: mostCorrectTopics.slice(0, 5)
      };

      // Gmail SMTP konfigürasyonu
      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || process.env.GMAIL_USER,
          pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Resimleri yükle - UPDATED PATHS
      const ataturkImage = fs.readFileSync(path.join(process.cwd(), 'client/public/ataturk.png'));
      const ataturkSignature = fs.readFileSync(path.join(process.cwd(), 'client/public/ataturkimza.png'));
      const turkishFlag = fs.readFileSync(path.join(process.cwd(), 'client/public/turkbayragi.png'));

      // Başarı koşullarını kontrol et
      const showAchievements = reportData.totalQuestions >= 1000 || 
        (reportData.tyt_net >= 60 && reportData.ayt_net >= 35);

      // Performans mesajını aktivite sayısına göre ayarla  
      let performanceMessage = '';
      const activities = reportData.totalActivities || 0;
      if (activities === 0) {
        performanceMessage = 'Bu ay henüz aktivite kaydım yok. Çalışmaya başlamak için harika bir zaman!';
      } else if (activities < 10) {
        performanceMessage = `Bu ay ${activities} aktivite gerçekleştirdim. Yola çıktım ve ilerlemeye devam ediyorum! 🚀`;
      } else if (activities < 30) {
        performanceMessage = `Bu ay ${activities} aktivite ile istikrarlı bir performans sergiledim. Bu tempoda ilerliyorum! 💪`;
      } else if (activities < 60) {
        performanceMessage = `Bu ay ${activities} aktivite ile kararlı bir tempo yakaladım. Hedefineme yaklaşıyorum! 🎯`;
      } else {
        performanceMessage = `Bu ay ${activities} aktivite ile üst düzey bir ritim sergiledim! Hedefineme kesinlikle ulaşacağım! 🌟`;
      }

      // Modern HTML Email içeriği
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: 'beratkaccow03@gmail.com, brtbllcankir03@gmail.com',
        subject: `📊 Aylık Çalışma Raporum - ${new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 20px; background: #F3F4F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            
            <div style="max-width: 800px; margin: 0 auto; background: linear-gradient(135deg, #E30A17 0%, #8B5CF6 50%, #E30A17 100%); padding: 25px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
              
              <!-- Atatürk Sözü Bölümü - En Üst -->
              <div style="background: rgba(255, 255, 255, 0.98); border-radius: 20px; padding: 35px; margin-bottom: 25px; text-align: center; border: 4px solid #E30A17; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
                
                <!-- Türk Bayrağı -->
                <div style="margin-bottom: 25px;">
                  <img src="cid:turkishflag" alt="Türk Bayrağı" style="width: 130px; height: auto; border-radius: 10px; box-shadow: 0 6px 16px rgba(0,0,0,0.25);" />
                </div>

                <!-- Atatürk Sözü -->
                <div style="margin: 25px 0;">
                  <p style="color: #1E293B; margin: 0; font-size: 21px; font-weight: bold; line-height: 1.7; font-style: italic; text-shadow: 1px 1px 3px rgba(0,0,0,0.1);">
                    "Biz her şeyi gençliğe bırakacağız... Geleceğin ümidi,<br>
                    ışıklı çiçekleri onlardır. Bütün ümidim gençliktedir."
                  </p>
                  <p style="color: #E30A17; margin: 18px 0 0 0; font-size: 17px; font-weight: bold; font-style: italic;">
                    - Mustafa Kemal Atatürk -
                  </p>
                </div>

                <!-- Atatürk İmzası -->
                <div style="margin: 25px 0;">
                  <img src="cid:ataturksignature" alt="Atatürk İmza" style="width: 200px; height: auto; opacity: 0.9;" />
                </div>

                <!-- Atatürk Fotoğrafı -->
                <div style="margin-top: 30px;">
                  <img src="cid:ataturkphoto" alt="Mustafa Kemal Atatürk" style="width: 150px; height: auto; border-radius: 15px; border: 4px solid #E30A17; box-shadow: 0 8px 24px rgba(0,0,0,0.35);" />
                </div>
              </div>

              <!-- Ana İçerik Alanı -->
              <div style="background: white; border-radius: 20px; padding: 45px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                
                <!-- Başlık -->
                <div style="text-align: center; margin-bottom: 40px;">
                  <h1 style="color: #8B5CF6; margin: 0 0 12px 0; font-size: 34px; font-weight: bold; text-transform: uppercase;">🎓 BERAT ÇAKIROĞLU</h1>
                  <h2 style="color: #E30A17; margin: 0 0 18px 0; font-size: 24px; font-weight: bold;">KİŞİSEL ÇALIŞMA ANALİZ RAPORU</h2>
                  <p style="color: #6B7280; margin: 0; font-size: 16px;">📅 ${new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} | 🎯 O üniversite kazanılacak!</p>
                </div>

                <!-- 1. Çözülen Soru ve Deneme -->
                <div style="display: table; width: 100%; margin-bottom: 30px;">
                  <div style="display: table-cell; width: 50%; padding-right: 10px;">
                    <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 20px; border-radius: 18px; text-align: center; box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);">
                      <div style="font-size: 13px; opacity: 0.95; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 8px;">📚 ÇÖZÜLEN SORU</div>
                      <div style="font-size: 42px; font-weight: bold;">${reportData.totalQuestions || 0}</div>
                    </div>
                  </div>
                  <div style="display: table-cell; width: 50%; padding-left: 10px;">
                    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 20px; border-radius: 18px; text-align: center; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);">
                      <div style="font-size: 13px; opacity: 0.95; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 8px;">🎯 ÇÖZÜLEN DENEME</div>
                      <div style="font-size: 42px; font-weight: bold;">${reportData.totalExams || 0}</div>
                    </div>
                  </div>
                </div>

                <!-- 2. Doğru, Yanlış ve Boş Analizi -->
                ${
                  reportData.totalQuestions > 0
                    ? `
                <div style="background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%); padding: 30px; border-radius: 18px; margin-bottom: 30px; border-left: 6px solid #10B981;">
                  <h3 style="color: #1E293B; margin: 0 0 25px 0; font-size: 20px; font-weight: bold;">📊 DOĞRU, YANLIŞ VE BOŞ ANALİZİ</h3>
                  <div style="display: table; width: 100%; margin-bottom: 20px;">
                    <div style="display: table-cell; width: 33.33%; padding-right: 7px;">
                      <div style="background: white; padding: 25px; border-radius: 14px; text-align: center; border: 3px solid #10B981;">
                        <div style="font-size: 42px; font-weight: bold; color: #10B981; margin-bottom: 8px;">${reportData.correctAnswers || 0}</div>
                        <div style="font-size: 15px; color: #059669; font-weight: 600;">✅ Doğru</div>
                      </div>
                    </div>
                    <div style="display: table-cell; width: 33.33%; padding: 0 7px;">
                      <div style="background: white; padding: 25px; border-radius: 14px; text-align: center; border: 3px solid #EF4444;">
                        <div style="font-size: 42px; font-weight: bold; color: #EF4444; margin-bottom: 8px;">${reportData.wrongAnswers || 0}</div>
                        <div style="font-size: 15px; color: #DC2626; font-weight: 600;">❌ Yanlış</div>
                      </div>
                    </div>
                    <div style="display: table-cell; width: 33.33%; padding-left: 7px;">
                      <div style="background: white; padding: 25px; border-radius: 14px; text-align: center; border: 3px solid #F59E0B;">
                        <div style="font-size: 42px; font-weight: bold; color: #F59E0B; margin-bottom: 8px;">${reportData.blankAnswers || 0}</div>
                        <div style="font-size: 15px; color: #D97706; font-weight: 600;">⭕ Boş</div>
                      </div>
                    </div>
                  </div>
                  <div style="margin-top: 25px; text-align: center; padding: 20px; background: white; border-radius: 14px; border: 2px solid #8B5CF6;">
                    <div style="font-size: 38px; font-weight: bold; color: #8B5CF6; margin-bottom: 8px;">${Math.round((reportData.correctAnswers / reportData.totalQuestions) * 100)}%</div>
                    <div style="font-size: 16px; color: #6B7280; font-weight: 600;">Başarı Oranım</div>
                    <div style="font-size: 14px; color: #9CA3AF; margin-top: 8px;">Net: ${reportData.correctAnswers - (reportData.wrongAnswers / 4)}</div>
                  </div>
                </div>
                    `
                    : ""
                }

                <!-- 3. Toplam Aktivite (Tek Sütun) -->
                <div style="width: 100%; margin-bottom: 25px;">
                  <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 25px; border-radius: 18px; text-align: center; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);">
                    <div>
                      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; opacity: 0.95;">📈 TOPLAM AKTİVİTE</h3>
                      <p style="margin: 0 0 12px 0; font-size: 13px; opacity: 0.9; line-height: 1.4;">
                        ${performanceMessage}
                      </p>
                    </div>
                    <div style="font-size: 46px; font-weight: bold;">${reportData.totalActivities || 0}</div>
                  </div>
                </div>
                
                <!-- 4. Tamamlanan Görevler (Tek Sütun) -->
                <div style="width: 100%; margin-bottom: 30px;">
                  <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 25px; border-radius: 18px; text-align: center; box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);">
                    <div>
                      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; opacity: 0.95;">✅ TAMAMLANAN GÖREVLER</h3>
                      <p style="margin: 0 0 12px 0; font-size: 13px; opacity: 0.9;">
                        Toplam ${reportData.totalTasks || 0} görevden ${reportData.completedTasks || 0} tanesini tamamladım!
                      </p>
                    </div>
                    <div style="font-size: 46px; font-weight: bold;">${reportData.completedTasks || 0}</div>
                  </div>
                </div>

                ${showAchievements ? `
                <!-- Bu Ayın Öne Çıkan Başarıları -->
                <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 30px; border-radius: 18px; margin-bottom: 30px; border-left: 6px solid #F59E0B;">
                  <h3 style="color: #92400E; margin: 0 0 22px 0; font-size: 20px; font-weight: bold;">💫 BU AYIN ÖNE ÇIKAN BAŞARILARI</h3>
                  <ul style="color: #78350F; margin: 0; padding-left: 22px; line-height: 1.9; font-size: 15px;">
                    ${reportData.totalQuestions >= 1000 ? `<li style="margin-bottom: 8px;"><strong>${reportData.totalQuestions}</strong> soru ile inanılmaz bir çalışma temposu sergiledim!</li>` : ""}
                    ${reportData.tyt_net >= 60 ? `<li style="margin-bottom: 8px;">TYT'de <strong>${reportData.tyt_net}</strong> net ile hedefime yaklaştım!</li>` : ""}
                    ${reportData.ayt_net >= 35 ? `<li style="margin-bottom: 8px;">AYT'de <strong>${reportData.ayt_net}</strong> net ile başarılı bir performans gösterdim!</li>` : ""}
                    <li style="margin-bottom: 8px;">Disiplinli çalışma alışkanlığımı sürdürüyorum</li>
                    <li>Her gün hedefineme bir adım daha yaklaşıyorum</li>
                  </ul>
                </div>
                ` : ""}

                <!-- 4. Rekor Deneme Netleri -->
                ${(reportData.maxTytNet > 0 || reportData.maxAytNet > 0) ? `
                <div style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); padding: 30px; border-radius: 18px; margin-bottom: 30px; border-left: 6px solid #3B82F6;">
                  <h3 style="color: #1E40AF; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">🏆 BU AYIN REKOR DENEME NETLERİ</h3>
                  <div style="display: table; width: 100%;">
                    ${reportData.maxTytNet > 0 ? `
                    <div style="display: table-cell; width: 50%; padding-right: 10px;">
                      <div style="background: white; padding: 25px; border-radius: 14px; text-align: center; border: 3px solid #8B5CF6;">
                        <div style="font-size: 16px; color: #6B7280; margin-bottom: 10px; font-weight: 600;">TYT Rekor Net</div>
                        <div style="font-size: 42px; font-weight: bold; color: #8B5CF6;">${reportData.maxTytNet}</div>
                      </div>
                    </div>
                    ` : ''}
                    ${reportData.maxAytNet > 0 ? `
                    <div style="display: table-cell; width: 50%; padding-left: ${reportData.maxTytNet > 0 ? '10px' : '0'};">
                      <div style="background: white; padding: 25px; border-radius: 14px; text-align: center; border: 3px solid #EF4444;">
                        <div style="font-size: 16px; color: #6B7280; margin-bottom: 10px; font-weight: 600;">AYT Rekor Net</div>
                        <div style="font-size: 42px; font-weight: bold; color: #EF4444;">${reportData.maxAytNet}</div>
                      </div>
                    </div>
                    ` : ''}
                  </div>
                </div>
                ` : ""}

                <!-- En Çok Soru Çözülen Tarih -->
                ${reportData.mostActiveDate ? `
                <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 30px; border-radius: 18px; margin-bottom: 30px; border-left: 6px solid #F59E0B;">
                  <h3 style="color: #92400E; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">🗓️ EN ÇOK SORU ÇÖZÜLEN TARİH</h3>
                  <div style="background: white; padding: 25px; border-radius: 14px; text-align: center; border: 3px solid #F59E0B;">
                    <div style="font-size: 18px; color: #6B7280; margin-bottom: 12px; font-weight: 600;">
                      ${new Date(reportData.mostActiveDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div style="font-size: 48px; font-weight: bold; color: #F59E0B; margin-bottom: 10px;">${reportData.maxQuestionsInDay}</div>
                    <div style="font-size: 16px; color: #92400E;">soru çözdüm</div>
                  </div>
                </div>
                ` : ""}
                
                <!-- 5. Sık Hata Yapılan Konular -->
                ${reportData.frequentWrongTopics && reportData.frequentWrongTopics.length > 0 ? `
                <div style="background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); padding: 30px; border-radius: 18px; margin-bottom: 30px; border-left: 6px solid #EF4444;">
                  <h3 style="color: #991B1B; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">⚠️ SIK HATA YAPILAN KONULAR</h3>
                  <div style="color: #7F1D1D; font-size: 15px; line-height: 1.7;">
                    ${reportData.frequentWrongTopics.slice(0, 10).map((item, index) => `
                      <div style="background: white; padding: 16px 20px; margin: 10px 0; border-radius: 10px; border-left: 4px solid #EF4444; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <strong style="color: #991B1B;">${index + 1}. ${item.topic}</strong>
                          <div style="font-size: 13px; color: #6B7280; margin-top: 4px;">${item.subject}</div>
                        </div>
                        <div style="background: #EF4444; color: white; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                          ${item.count}x
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
                ` : ""}

                <!-- 5. En Çok Hata Yapılan Dersler -->
                ${reportData.mostWrongSubjects && reportData.mostWrongSubjects.length > 0 ? `
                <div style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); padding: 30px; border-radius: 18px; margin-bottom: 30px; border-left: 6px solid #3B82F6;">
                  <h3 style="color: #1E40AF; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">📉 EN ÇOK HATA YAPILAN DERSLER</h3>
                  <div>
                    ${reportData.mostWrongSubjects.slice(0, 3).map((subject, index) => `
                      <div style="background: white; padding: 18px 22px; margin: 12px 0; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #3B82F6;">
                        <span style="color: #1E3A8A; font-weight: 600; font-size: 16px;">${index + 1}. ${subject.name}</span>
                        <span style="color: #EF4444; font-weight: bold; font-size: 20px;">${subject.count} hata</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
                ` : ""}

                <!-- 6. En Çok Soru Çözülen Dersler -->
                ${reportData.mostSolvedSubjects && reportData.mostSolvedSubjects.length > 0 ? `
                <div style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); padding: 30px; border-radius: 18px; margin-bottom: 30px; border-left: 6px solid #10B981;">
                  <h3 style="color: #065F46; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">📚 EN ÇOK SORU ÇÖZÜLEN DERSLER</h3>
                  <div>
                    ${reportData.mostSolvedSubjects.slice(0, 3).map((subject, index) => `
                      <div style="background: white; padding: 18px 22px; margin: 12px 0; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #10B981;">
                        <span style="color: #064E3B; font-weight: 600; font-size: 16px;">${index + 1}. ${subject.name}</span>
                        <span style="color: #10B981; font-weight: bold; font-size: 20px;">${subject.count} soru</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
                ` : ""}

                <!-- 7. En Çok Doğru Yapılan Dersler -->
                ${reportData.mostCorrectSubjects && reportData.mostCorrectSubjects.length > 0 ? `
                <div style="background: linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%); padding: 30px; border-radius: 18px; margin-bottom: 30px; border-left: 6px solid #8B5CF6;">
                  <h3 style="color: #5B21B6; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">🏆 EN ÇOK DOĞRU YAPILAN DERSLER</h3>
                  <div>
                    ${reportData.mostCorrectSubjects.slice(0, 3).map((subject, index) => `
                      <div style="background: white; padding: 18px 22px; margin: 12px 0; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #8B5CF6;">
                        <span style="color: #6D28D9; font-weight: 600; font-size: 16px;">${index + 1}. ${subject.name}</span>
                        <span style="color: #10B981; font-weight: bold; font-size: 20px;">${subject.count} doğru</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
                ` : ""}

                <!-- Deneme Detayları -->
                ${reportData.examDetailsWithSubjects && reportData.examDetailsWithSubjects.length > 0 ? `
                <div style="background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); padding: 30px; border-radius: 18px; margin-bottom: 30px; border-left: 6px solid #8B5CF6;">
                  <h3 style="color: #6B21A8; margin: 0 0 25px 0; font-size: 22px; font-weight: bold;">📋 DENEME DETAYLARI</h3>
                  ${reportData.examDetailsWithSubjects.map((exam, examIndex) => `
                    <div style="background: white; padding: 25px; margin-bottom: 20px; border-radius: 14px; border: 2px solid #A78BFA;">
                      <!-- Deneme Başlığı -->
                      <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #E9D5FF;">
                        <h4 style="color: #7C3AED; margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">${exam.exam_name || `Deneme ${examIndex + 1}`}</h4>
                        <div style="color: #6B7280; font-size: 14px;">
                          📅 ${new Date(exam.exam_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} | 
                          📝 ${exam.exam_type || 'N/A'}
                        </div>
                      </div>

                      <!-- Toplam Netler -->
                      <div style="display: table; width: 100%; margin-bottom: 20px;">
                        ${exam.tyt_net ? `
                        <div style="display: table-cell; width: 50%; padding-right: 10px;">
                          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: white; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">TYT Net</div>
                            <div style="font-size: 28px; font-weight: bold;">${exam.tyt_net}</div>
                          </div>
                        </div>
                        ` : ''}
                        ${exam.ayt_net ? `
                        <div style="display: table-cell; width: 50%; padding-left: ${exam.tyt_net ? '10px' : '0'};">
                          <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">AYT Net</div>
                            <div style="font-size: 28px; font-weight: bold;">${exam.ayt_net}</div>
                          </div>
                        </div>
                        ` : ''}
                      </div>

                      <!-- Ders Detayları -->
                      ${exam.subjects && exam.subjects.length > 0 ? `
                      <div style="margin-top: 20px;">
                        <h5 style="color: #6B21A8; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">📚 Ders Bazında Performans</h5>
                        ${exam.subjects.map((subject, subIndex) => `
                          <div style="background: #F9FAFB; padding: 15px; margin: 10px 0; border-radius: 10px; border-left: 4px solid ${subIndex % 2 === 0 ? '#8B5CF6' : '#3B82F6'};">
                            <!-- Ders Adı -->
                            <div style="font-weight: bold; color: #1F2937; margin-bottom: 10px; font-size: 15px;">${subject.subject || 'Bilinmeyen Ders'}</div>
                            
                            <!-- Doğru Yanlış Boş Net -->
                            <div style="display: table; width: 100%; margin-bottom: 10px;">
                              <div style="display: table-cell; width: 25%; padding-right: 5px;">
                                <div style="background: white; padding: 8px; border-radius: 6px; text-align: center; border: 2px solid #10B981;">
                                  <div style="font-size: 11px; color: #6B7280; margin-bottom: 3px;">Doğru</div>
                                  <div style="font-size: 16px; font-weight: bold; color: #10B981;">${subject.correct_count || 0}</div>
                                </div>
                              </div>
                              <div style="display: table-cell; width: 25%; padding: 0 5px;">
                                <div style="background: white; padding: 8px; border-radius: 6px; text-align: center; border: 2px solid #EF4444;">
                                  <div style="font-size: 11px; color: #6B7280; margin-bottom: 3px;">Yanlış</div>
                                  <div style="font-size: 16px; font-weight: bold; color: #EF4444;">${subject.wrong_count || 0}</div>
                                </div>
                              </div>
                              <div style="display: table-cell; width: 25%; padding: 0 5px;">
                                <div style="background: white; padding: 8px; border-radius: 6px; text-align: center; border: 2px solid #F59E0B;">
                                  <div style="font-size: 11px; color: #6B7280; margin-bottom: 3px;">Boş</div>
                                  <div style="font-size: 16px; font-weight: bold; color: #F59E0B;">${subject.blank_count || 0}</div>
                                </div>
                              </div>
                              <div style="display: table-cell; width: 25%; padding-left: 5px;">
                                <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 8px; border-radius: 6px; text-align: center;">
                                  <div style="font-size: 11px; color: white; opacity: 0.9; margin-bottom: 3px;">Net</div>
                                  <div style="font-size: 16px; font-weight: bold; color: white;">${subject.net_score || 0}</div>
                                </div>
                              </div>
                            </div>

                            <!-- Yanlış Konular -->
                            ${subject.wrong_topics && subject.wrong_topics.length > 0 ? `
                            <div style="margin-top: 12px; padding: 12px; background: white; border-radius: 8px;">
                              <div style="font-size: 12px; color: #991B1B; font-weight: bold; margin-bottom: 8px;">❌ Yanlış Yapılan Konular:</div>
                              <div style="font-size: 12px; color: #7F1D1D; line-height: 1.6;">
                                ${subject.wrong_topics.map(topic => `<div style="padding: 4px 0;">• ${topic}</div>`).join('')}
                              </div>
                            </div>
                            ` : '<div style="margin-top: 8px; font-size: 12px; color: #10B981; font-style: italic;">✅ Bu derste yanlış konu kaydı yok</div>'}
                          </div>
                        `).join('')}
                      </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
                ` : ""}

                <!-- Kapanış -->
                <div style="text-align: center; margin-top: 35px; padding: 25px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(227, 10, 23, 0.15) 100%); border-radius: 14px; border: 3px solid #E30A17;">
                  <p style="color: #8B5CF6; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">
                    🚀 Bu rapor ${new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} tarihinde otomatik olarak oluşturulmuştur.
                  </p>
                  <p style="color: #E30A17; margin: 0; font-size: 18px; font-weight: bold;">
                    🇹🇷 Berat Çakıroğlu Kişisel Analiz Sistemi 🇹🇷
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        attachments: [
          {
            filename: 'ataturk.png',
            content: ataturkImage,
            cid: 'ataturkphoto'
          },
          {
            filename: 'ataturk-imza.png',
            content: ataturkSignature,
            cid: 'ataturksignature'
          },
          {
            filename: 'turk-bayragi.png',
            content: turkishFlag,
            cid: 'turkishflag'
          }
        ],
      };

      // E-posta yapılandırması kontrolü
      const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
      const emailPass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;
      
      if (!emailUser || !emailPass) {
        return res.status(400).json({
          success: false,
          message: "E-posta ayarları yapılandırılmamış! 📧",
          details: "Rapor göndermek için e-posta ayarlarınızı yapmanız gerekiyor.",
          instructions: [
            "1. Replit Secrets bölümüne gidin",
            "2. Aşağıdaki değişkenleri ekleyin:",
            "   • EMAIL_USER: Gmail adresiniz (örn: ornek@gmail.com)",
            "   • EMAIL_PASS: Gmail uygulama şifreniz",
            "",
            "⚠️ Önemli: Gmail için normal şifre değil, 'Uygulama Şifresi' kullanmalısınız!",
            "",
            "Gmail Uygulama Şifresi Alma Adımları:",
            "1. Google Hesabım > Güvenlik bölümüne gidin",
            "2. '2 Adımlı Doğrulama'yı aktif edin (zorunlu)",
            "3. 'Uygulama şifreleri' kısmından yeni şifre oluşturun",
            "4. Oluşan 16 haneli şifreyi EMAIL_PASS olarak kaydedin"
          ].join("\n")
        });
      }

      // E-postayı gönder
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);
        res.json({
          success: true,
          message: "✅ Rapor başarıyla e-posta adreslerine gönderildi!",
          details: `Rapor ${new Date().toLocaleString("tr-TR")} tarihinde gönderildi.`
        });
      } catch (emailError: any) {
        console.error("Email sending failed:", emailError);

        // Email hatasının türüne göre farklı mesajlar
        if (emailError.code === "ENOTFOUND" || emailError.code === "ECONNECTION") {
          res.status(500).json({
            success: false,
            message: "🌐 İnternet bağlantısı hatası!",
            details: "Email servisi ile bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol edin.",
            error: emailError.message
          });
        } else if (emailError.responseCode === 550) {
          res.status(400).json({
            success: false,
            message: "📧 Geçersiz e-posta adresi!",
            details: "Alıcı e-posta adresi bulunamadı veya geçersiz. Lütfen e-posta adreslerini kontrol edin.",
            error: emailError.message
          });
        } else if (emailError.responseCode === 535 || emailError.code === "EAUTH") {
          res.status(401).json({
            success: false,
            message: "🔐 Kimlik doğrulama hatası!",
            details: "Gmail kullanıcı adı veya şifre yanlış.",
            instructions: [
              "• EMAIL_USER değişkeninin doğru Gmail adresi olduğundan emin olun",
              "• EMAIL_PASS için Gmail Uygulama Şifresi kullandığınızdan emin olun",
              "• Normal Gmail şifreniz çalışmaz, mutlaka Uygulama Şifresi oluşturun",
              "• 2 Adımlı Doğrulama aktif olmalıdır"
            ].join("\n"),
            error: emailError.message
          });
        } else {
          res.status(500).json({
            success: false,
            message: "❌ E-posta gönderiminde beklenmeyen hata!",
            details: emailError.message || "Bilinmeyen bir hata oluştu.",
            help: "Sorun devam ederse Replit Secrets bölümündeki EMAIL_USER ve EMAIL_PASS değerlerini kontrol edin."
          });
        }
      }
    } catch (error) {
      console.error("Email error:", error);
      res
        .status(500)
        .json({ message: "Rapor gönderilirken hata oluştu: " + error.message });
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
        return res
          .status(400)
          .json({ message: "Geçerli bir email adresi giriniz" });
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
            totalActivities: 7,
          },
        },
        deneme_tamamlandi: {
          subject: "📝 Deneme Sınavı Tamamlandı - Test",
          reportData: {
            totalQuestions: 120,
            correctAnswers: 85,
            wrongAnswers: 35,
            totalExams: 5,
            totalTasks: 8,
            totalActivities: 15,
          },
        },
        hatali_konular: {
          subject: "⚠️ Hatalı Konular Analizi - Test",
          reportData: {
            totalQuestions: 50,
            correctAnswers: 30,
            wrongAnswers: 20,
            totalExams: 2,
            totalTasks: 5,
            totalActivities: 9,
          },
        },
        gorev_eklendi: {
          subject: "✅ Yeni Görevler Eklendi - Test",
          reportData: {
            totalQuestions: 15,
            correctAnswers: 12,
            wrongAnswers: 3,
            totalExams: 1,
            totalTasks: 12,
            totalActivities: 20,
          },
        },
        gorev_tamamlandi: {
          subject: "🎉 Görevler Tamamlandı - Test",
          reportData: {
            totalQuestions: 40,
            correctAnswers: 35,
            wrongAnswers: 5,
            totalExams: 3,
            totalTasks: 15,
            totalActivities: 25,
          },
        },
        aylik_ozet: {
          subject: "📊 Aylık Özet Raporu - Test",
          reportData: {
            totalQuestions: 200,
            correctAnswers: 160,
            wrongAnswers: 40,
            totalExams: 8,
            totalTasks: 25,
            totalActivities: 50,
          },
        },
      };

      const scenario = testScenarios[testType] || testScenarios.aylik_ozet;

      // PDF oluştur
      const doc = new PDFKit({
        size: "A4",
        margin: 40,
        bufferPages: true,
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);

        // Gmail SMTP konfigürasyonu
        const transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || process.env.GMAIL_USER,
            pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
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
                    Bu bir test e-postasıdır. Test türü: <strong>${testType || "aylik_ozet"}</strong><br>
                    ${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR")} tarihinde gönderildi.
                  </p>
                </div>
                
                <!-- Başlık Kısmı -->
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8B5CF6; padding-bottom: 20px;">
                  <h1 style="color: #8B5CF6; margin: 0; font-size: 28px; font-weight: bold; margin-bottom: 8px;">
                    📊 Test Raporu
                  </h1>
                  <p style="color: #64748B; margin: 0; font-size: 16px; font-weight: 500;">
                    ${new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} Dönemi - Berat Çakıroğlu
                  </p>
                  <p style="color: #9CA3AF; margin: 5px 0 0 0; font-size: 12px;">
                    Test Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR")}
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
                    📱 Test türü: ${testType || "aylik_ozet"} | 📋 PDF test raporu ekte
                  </p>
                </div>
              </div>
            </div>
          `,
          attachments: [
            {
              filename: `test-raporu-${testType || "aylik_ozet"}-${new Date().toLocaleDateString("tr-TR").replace(/\./g, "-")}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        };

        // E-postayı gönder
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          transporter
            .sendMail(mailOptions)
            .then(() => {
              res.json({
                message: `Test e-postası başarıyla gönderildi! Test türü: ${testType || "aylik_ozet"}`,
                testType: testType || "aylik_ozet",
                emailSent: true,
              });
            })
            .catch((emailError) => {
              console.error("Test email gönderim hatası:", emailError);
              res.status(500).json({
                message: `Test e-posta gönderiminde hata: ${emailError.message}`,
                testType: testType || "aylik_ozet",
                emailSent: false,
              });
            });
        } else {
          res.json({
            message:
              "E-posta kimlik bilgileri yapılandırılmamış - Test PDF oluşturuldu",
            testType: testType || "aylik_ozet",
            emailSent: false,
          });
        }
      });

      // PDF içeriği oluştur
      generatePDFContent(doc, scenario.reportData);
      doc.end();
    } catch (error) {
      console.error("Test email error:", error);
      res
        .status(500)
        .json({ message: "Test e-posta gönderiminde hata oluştu" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
