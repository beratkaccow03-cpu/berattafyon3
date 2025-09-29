//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
import { useState } from "react";
import { Header } from "@/components/header";
import { TasksSection } from "@/components/tasks-section";
import { ProfileModal } from "@/components/profile-modal";
import { AddTaskModal } from "@/components/add-task-modal";

export default function Home() {
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Görevler Bölümü - Artık kenar çubuğu yok */}
        <TasksSection onAddTask={() => setAddTaskModalOpen(true)} />
      </main>

      {/* Modallar */}
      <AddTaskModal 
        open={addTaskModalOpen} 
        onOpenChange={setAddTaskModalOpen} 
      />
    </div>
  );
}
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
//BERATCAKIROGLU OZEL ANALİZ TAKIP SISTEMI
