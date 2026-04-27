import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Bell,
  Save,
  Loader2,
  MessageCircle,
  Clock,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

export default function SettingsPage() {
  const utils = trpc.useUtils();

  // Telegram settings
  const { data: telegramSettings } = trpc.telegram.getSettings.useQuery();
  const saveTelegram = trpc.telegram.saveSettings.useMutation({
    onSuccess: () => utils.telegram.getSettings.invalidate(),
  });
  const deleteTelegram = trpc.telegram.deleteSettings.useMutation({
    onSuccess: () => utils.telegram.getSettings.invalidate(),
  });

  // Reminder settings
  const { data: reminderSettingsData } = trpc.reminder.getSettings.useQuery();
  const updateReminders = trpc.reminder.updateSettings.useMutation({
    onSuccess: () => utils.reminder.getSettings.invalidate(),
  });

  const [tgForm, setTgForm] = useState({
    telegramId: "",
    telegramUsername: "",
    botToken: "",
  });

  const [reminderForm, setReminderForm] = useState({
    morningTime: "08:00",
    afternoonTime: "13:00",
    eveningTime: "20:00",
    morningEnabled: true,
    afternoonEnabled: true,
    eveningEnabled: true,
    timezone: "UTC",
  });

  // Load existing data into forms
  useEffect(() => {
    if (telegramSettings) {
      setTgForm({
        telegramId: String(telegramSettings.telegramId),
        telegramUsername: telegramSettings.telegramUsername || "",
        botToken: telegramSettings.botToken,
      });
    }
  }, [telegramSettings]);

  useEffect(() => {
    if (reminderSettingsData) {
      setReminderForm({
        morningTime: reminderSettingsData.morningTime,
        afternoonTime: reminderSettingsData.afternoonTime,
        eveningTime: reminderSettingsData.eveningTime,
        morningEnabled: reminderSettingsData.morningEnabled,
        afternoonEnabled: reminderSettingsData.afternoonEnabled,
        eveningEnabled: reminderSettingsData.eveningEnabled,
        timezone: reminderSettingsData.timezone,
      });
    }
  }, [reminderSettingsData]);

  const handleSaveTelegram = () => {
    saveTelegram.mutate({
      telegramId: Number(tgForm.telegramId),
      telegramUsername: tgForm.telegramUsername || undefined,
      botToken: tgForm.botToken,
    });
  };

  const handleSaveReminders = () => {
    updateReminders.mutate(reminderForm);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Настройки
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Настрой бота и расписание напоминаний
          </p>
        </div>

        {/* Telegram Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-500" />
              Telegram бот
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {telegramSettings && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Бот подключён
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ID: {telegramSettings.telegramId}
                    {telegramSettings.telegramUsername &&
                      ` (@${telegramSettings.telegramUsername})`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteTelegram.mutate()}
                  disabled={deleteTelegram.isPending}
                >
                  Отключить
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="tg-id">Telegram User ID</Label>
                <Input
                  id="tg-id"
                  value={tgForm.telegramId}
                  onChange={(e) =>
                    setTgForm({ ...tgForm, telegramId: e.target.value })
                  }
                  placeholder="550553189"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Узнай через @userinfobot в Telegram
                </p>
              </div>
              <div>
                <Label htmlFor="tg-username">Telegram Username (необязательно)</Label>
                <Input
                  id="tg-username"
                  value={tgForm.telegramUsername}
                  onChange={(e) =>
                    setTgForm({ ...tgForm, telegramUsername: e.target.value })
                  }
                  placeholder="@username"
                />
              </div>
              <div>
                <Label htmlFor="bot-token">Bot Token</Label>
                <Input
                  id="bot-token"
                  value={tgForm.botToken}
                  onChange={(e) =>
                    setTgForm({ ...tgForm, botToken: e.target.value })
                  }
                  placeholder="123456789:ABC..."
                  type="password"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Получи через @BotFather в Telegram
                </p>
              </div>
              <Button
                onClick={handleSaveTelegram}
                disabled={saveTelegram.isPending || !tgForm.telegramId || !tgForm.botToken}
                className="gap-2"
              >
                {saveTelegram.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <Save className="w-4 h-4" />
                Сохранить Telegram
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Напоминания
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Morning */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Утренняя сводка
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Начни день с плана
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="time"
                    value={reminderForm.morningTime}
                    onChange={(e) =>
                      setReminderForm({
                        ...reminderForm,
                        morningTime: e.target.value,
                      })
                    }
                    className="w-24"
                  />
                  <Switch
                    checked={reminderForm.morningEnabled}
                    onCheckedChange={(v) =>
                      setReminderForm({ ...reminderForm, morningEnabled: v })
                    }
                  />
                </div>
              </div>

              {/* Afternoon */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Дневная сводка
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Проверь прогресс
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="time"
                    value={reminderForm.afternoonTime}
                    onChange={(e) =>
                      setReminderForm({
                        ...reminderForm,
                        afternoonTime: e.target.value,
                      })
                    }
                    className="w-24"
                  />
                  <Switch
                    checked={reminderForm.afternoonEnabled}
                    onCheckedChange={(v) =>
                      setReminderForm({ ...reminderForm, afternoonEnabled: v })
                    }
                  />
                </div>
              </div>

              {/* Evening */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Вечерняя сводка
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Подведи итоги дня
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="time"
                    value={reminderForm.eveningTime}
                    onChange={(e) =>
                      setReminderForm({
                        ...reminderForm,
                        eveningTime: e.target.value,
                      })
                    }
                    className="w-24"
                  />
                  <Switch
                    checked={reminderForm.eveningEnabled}
                    onCheckedChange={(v) =>
                      setReminderForm({ ...reminderForm, eveningEnabled: v })
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label htmlFor="timezone">Часовой пояс</Label>
              <Input
                id="timezone"
                value={reminderForm.timezone}
                onChange={(e) =>
                  setReminderForm({ ...reminderForm, timezone: e.target.value })
                }
                placeholder="UTC, Europe/Moscow, etc."
                className="mt-1.5"
              />
              <p className="text-xs text-slate-400 mt-1">
                Например: UTC, Europe/Moscow, Europe/London
              </p>
            </div>

            <Button
              onClick={handleSaveReminders}
              disabled={updateReminders.isPending}
              className="gap-2"
            >
              {updateReminders.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              <Save className="w-4 h-4" />
              Сохранить расписание
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
