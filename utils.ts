import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Edit3,
  Loader2,
  Bot,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

const priorityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const statusLabels = {
  pending: "Ожидает",
  in_progress: "В работе",
  completed: "Выполнено",
  cancelled: "Отменено",
};

const priorityLabels = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export default function Dashboard() {
  const utils = trpc.useUtils();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  const { data: allTasks, isLoading } = trpc.task.list.useQuery({});
  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
      setIsDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "medium" });
    },
  });
  const updateTask = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
      setEditingTask(null);
      setIsDialogOpen(false);
    },
  });
  const deleteTask = trpc.task.delete.useMutation({
    onSuccess: () => utils.task.list.invalidate(),
  });

  const tasks = allTasks || [];
  const pendingTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const handleSave = () => {
    if (editingTask) {
      updateTask.mutate({
        id: editingTask.id,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
      });
    } else {
      createTask.mutate(newTask);
    }
  };

  const handleComplete = (taskId: number) => {
    updateTask.mutate({ id: taskId, status: "completed" });
  };

  const handleDelete = (taskId: number) => {
    deleteTask.mutate({ id: taskId });
  };

  const openEdit = (task: any) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
    });
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setEditingTask(null);
    setNewTask({ title: "", description: "", priority: "medium" });
    setIsDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Мои задачи
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Управляй задачами и отслеживай прогресс
            </p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Новая задача
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Активные
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {pendingTasks.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Выполнено
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {completedTasks.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Всего
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {tasks.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              Активные ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Выполненные ({completedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : pendingTasks.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Bot className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">Нет активных задач</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                  Добавь задачу или напиши боту в Telegram
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-start gap-4 group hover:shadow-sm transition-shadow"
                  >
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="mt-1 text-slate-400 hover:text-green-500 transition-colors"
                    >
                      <Circle className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-slate-900 dark:text-white">
                          {task.title}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={priorityColors[task.priority]}
                        >
                          {priorityLabels[task.priority]}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(task.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {statusLabels[task.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(task)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(task.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                Пока нет выполненных задач
              </div>
            ) : (
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-start gap-4 opacity-75"
                  >
                    <CheckCircle2 className="mt-1 w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-700 dark:text-slate-300 line-through">
                        {task.title}
                      </h3>
                      {task.completedAt && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Выполнено {new Date(task.completedAt).toLocaleDateString("ru-RU")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "Редактировать задачу" : "Новая задача"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Название</label>
                <Input
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  placeholder="Что нужно сделать?"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Описание</label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  placeholder="Детали задачи (необязательно)"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Приоритет</label>
                <Select
                  value={newTask.priority}
                  onValueChange={(v: "low" | "medium" | "high") =>
                    setNewTask({ ...newTask, priority: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!newTask.title.trim() || createTask.isPending || updateTask.isPending}
                >
                  {(createTask.isPending || updateTask.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingTask ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
