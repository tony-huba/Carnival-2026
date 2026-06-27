import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  useStore,
  calculateTeamScore,
  calculateTeamProgress,
  calculatePlayerScore,
} from "../store";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import {
  Pencil,
  Check,
  X,
  Award,
  Target,
  Trophy,
  Plus,
  Calendar,
  ChevronDown,
  ChevronUp,
  Undo,
  Trash2,
  Search,
  Camera,
  Eye,
  Upload,
  Key,
} from "lucide-react";
import { MvpLeaderboard } from "./MvpLeaderboard";
import { ImageCropperModal } from "./ImageCropperModal";
import { SettingsPanel } from "./SettingsPanel";

interface AnimatedScoreInputProps {
  value: number | "";
  min?: number;
  max: number;
  onChange: (val: number | "") => void;
  className?: string;
  activeColor?: string;
  disabled?: boolean;
}

function AnimatedScoreInput({
  value,
  min = 0,
  max,
  onChange,
  className = "",
  activeColor = "amber",
  disabled = false,
}: AnimatedScoreInputProps) {
  const [prevValue, setPrevValue] = useState<number | "">(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value !== prevValue) {
      if (typeof value === "number" && typeof prevValue === "number") {
        if (value > prevValue) {
          setFlash("up");
        } else if (value < prevValue) {
          setFlash("down");
        }
      }
      setPrevValue(value);
      const timer = setTimeout(() => setFlash(null), 800);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  let bgFlashClass = "bg-white border-slate-200";
  if (flash === "up") {
    bgFlashClass =
      "bg-emerald-50 text-emerald-800 border-emerald-400 scale-105 shadow-md shadow-emerald-500/10 font-bold z-10";
  } else if (flash === "down") {
    bgFlashClass =
      "bg-rose-50 text-rose-800 border-rose-400 scale-105 shadow-md shadow-rose-500/10 font-bold z-10";
  }

  const borderFocusClass =
    activeColor === "sky"
      ? "focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
      : "focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20";

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onChange("");
          return;
        }
        const parsed = parseInt(raw, 10);
        if (isNaN(parsed)) {
          onChange("");
          return;
        }
        const val = Math.min(max, Math.max(min, parsed));
        onChange(val);
      }}
      className={cn(
        "text-center text-xs font-bold p-1 rounded-lg border focus:outline-none transition-all duration-300 ease-out",
        bgFlashClass,
        borderFocusClass,
        disabled &&
          "bg-slate-100 border-slate-150 text-slate-400 cursor-not-allowed opacity-80",
        className,
      )}
    />
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmBtnClassName?: string;
  cancelBtnClassName?: string;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Yes, Confirm",
  cancelLabel = "Cancel",
  confirmBtnClassName,
  cancelBtnClassName,
}: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Modal Dialog */}
      <div className="bg-white rounded-[24px] p-6 max-w-md w-full border border-slate-100 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-amber-600 mb-3">
          <span className="text-2xl">⚠️</span>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed" dir="auto">
          {message}
        </p>
        <div className="flex gap-2.5 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className={
              cancelBtnClassName ||
              "px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
            }
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={
              confirmBtnClassName ||
              "px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-md cursor-pointer"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AdminDashboardProps {
  onBack: () => void;
  adminUserType?: "super" | "team";
  loggedInTeamId?: string | null;
}

export function AdminDashboard({
  onBack,
  adminUserType = "super",
  loggedInTeamId = null,
}: AdminDashboardProps) {
  const {
    teams,
    games,
    players,
    days,
    activeDayId,
    addDay,
    deleteDay,
    setActiveDayId,
    addGame,
    deleteGame,
    addSubGame,
    deleteSubGame,
    updateScore,
    eventTargetScore,
    setEventTargetScore,
    addPlayer,
    deletePlayer,
    updatePlayerScore,
    editGame,
    editSubGame,
    updatePlayerAvatar,
    editDay,
    setTeamCode,
    deleteTeam,
    addTeam,
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    "scoring" | "setup" | "activities" | "mvp" | "leaderboard" | "settings" | "badges"
  >("scoring");

  // Cropping Modal configuration state
  const [croppingPlayer, setCroppingPlayer] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Avatar Choice options & full viewer state
  const [avatarActionPlayer, setAvatarActionPlayer] = useState<{
    id: string;
    name: string;
    avatarUrl: string;
  } | null>(null);
  const [viewingAvatarUrl, setViewingAvatarUrl] = useState<{
    name: string;
    url: string;
  } | null>(null);

  // Day inline edit state
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editDayName, setEditDayName] = useState("");
  const [showDaySettings, setShowDaySettings] = useState(false);
  
  // Custom inline delete confirmations
  const [confirmingDeletes, setConfirmingDeletes] = useState<Record<string, boolean>>({});

  // Big Game Day Selector Error state
  const [gameDayError, setGameDayError] = useState<string | null>(null);

  // Days Forms
  const [newDayName, setNewDayName] = useState("");
  const [newDayDate, setNewDayDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Scoring tab selected day
  const [selectedDayId, setSelectedDayId] = useState<string>("unselected");

  // Ensure selectedDayId always points to a valid day (or 'unassigned')
  useEffect(() => {
    if (selectedDayId === "unassigned") return;
    if (selectedDayId === "unselected") return;
    if (Object.keys(days).length > 0 && !days[selectedDayId]) {
      setSelectedDayId("unselected");
    }
  }, [days, selectedDayId]);

  // Sub-team PIN editing state
  const [editingTeamPinId, setEditingTeamPinId] = useState<string | null>(null);
  const [newTeamPin, setNewTeamPin] = useState<string>("");

  // Customizable Activities configurations loader from LocalStorage with defaults
  const [activities, setActivities] = useState<
    Record<
      string,
      { name: string; icon: string; maxPoints: number; isDaily: boolean }
    >
  >(() => {
    const saved = localStorage.getItem("scoring_activities_config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      attendance: {
        name: "Attendance",
        icon: "👥",
        maxPoints: 10,
        isDaily: true,
      },
      tashge3: {
        name: "Tashge3 (Cheering)",
        icon: "📣",
        maxPoints: 15,
        isDaily: true,
      },
      teamwork: { name: "Teamwork", icon: "🤝", maxPoints: 15, isDaily: true },
      creativity: {
        name: "Creativity",
        icon: "🎨",
        maxPoints: 20,
        isDaily: false,
      },
      she3ar: {
        name: "She3ar (Slogan)",
        icon: "🏷️",
        maxPoints: 20,
        isDaily: false,
      },
      la7n: {
        name: "Church La7n Memorization",
        icon: "🎵",
        maxPoints: 25,
        isDaily: false,
      },
    };
  });

  // Fetch activities from Supabase on load
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase.from("activities").select("*");
        if (error) {
          console.warn(
            "Unable to load activities from Supabase. Table might not exist yet.",
            error,
          );
          return;
        }
        if (data && data.length > 0) {
          const loaded: Record<
            string,
            { name: string; icon: string; maxPoints: number; isDaily: boolean }
          > = {};
          data.forEach((act) => {
            loaded[act.id] = {
              name: act.name,
              icon: act.icon || "🏆",
              maxPoints: act.max_points || 10,
              isDaily: act.is_daily ?? true,
            };
          });
          setActivities(loaded);
          localStorage.setItem(
            "scoring_activities_config",
            JSON.stringify(loaded),
          );
        }
      } catch (err) {
        console.warn("Activities Supabase fetch error:", err);
      }
    };
    fetchActivities();
  }, []);

  // Keep LocalStorage synchronized on activity configuration updates
  useEffect(() => {
    localStorage.setItem(
      "scoring_activities_config",
      JSON.stringify(activities),
    );
  }, [activities]);

  const [expandedActivities, setExpandedActivities] = useState<
    Record<string, boolean>
  >({});
  const [editingActivity, setEditingActivity] = useState<{
    key: string;
    name: string;
    icon: string;
    maxPoints: string;
    isDaily: boolean;
  } | null>(null);

  const toggleActivityDaily = (key: string) => {
    const updated = {
      ...activities[key],
      isDaily: !activities[key].isDaily,
    };
    setActivities((prev) => ({
      ...prev,
      [key]: updated,
    }));

    // Save update in Supabase
    supabase
      .from("activities")
      .upsert({
        id: key,
        name: updated.name,
        icon: updated.icon,
        max_points: updated.maxPoints,
        is_daily: updated.isDaily,
      })
      .then(({ error }) => {
        if (error) {
          console.warn("Failed to upsert updated activity in Supabase:", error);
        }
      });
  };

  // Icon selection modes (preset / custom)
  const [newIconSelectMode, setNewIconSelectMode] = useState<
    "preset" | "custom"
  >("preset");
  const [editIconSelectMode, setEditIconSelectMode] = useState<
    "preset" | "custom"
  >("preset");

  // Track timestamps/days of when each activity was scored
  const [activityScoringDates, setActivityScoringDates] = useState<
    Record<string, string>
  >(() => {
    try {
      const saved = localStorage.getItem("activity_scoring_dates");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Activity Setup Form
  const [newActivityName, setNewActivityName] = useState("");
  const [newActivityMaxPoints, setNewActivityMaxPoints] = useState("");
  const [newActivityIcon, setNewActivityIcon] = useState("🏆");
  const [newActivityIsDaily, setNewActivityIsDaily] = useState(true);

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim()) return;
    const sanitizedKey =
      "activity_custom_" +
      newActivityName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_") +
      "_" +
      Date.now();

    const newAct = {
      name: newActivityName.trim(),
      icon: newActivityIcon || "🏆",
      maxPoints: Number(newActivityMaxPoints) || 20,
      isDaily: newActivityIsDaily,
    };

    setActivities((prev) => ({
      ...prev,
      [sanitizedKey]: newAct,
    }));

    // Save in Supabase
    (async () => {
      try {
        const { error } = await supabase
          .from("activities")
          .upsert({
            id: sanitizedKey,
            name: newAct.name,
            icon: newAct.icon,
            max_points: newAct.maxPoints,
            is_daily: newAct.isDaily,
          });

        if (error) {
          console.warn("Failed to upsert new activity in Supabase:", error);
          useStore.setState({
            dbNotification: {
              message: `DB Error creating activity: ${error.message || error}`,
              type: "error",
            },
          });
        } else {
          useStore.setState({
            dbNotification: {
              message: `Database processing complete! Activity "${newAct.name}" saved successfully in Supabase.`,
              type: "success",
            },
          });
          setTimeout(() => {
            useStore.getState().clearDbNotification();
          }, 4500);
        }
      } catch (err) {
        console.warn("Failed to reach database for new activity:", err);
        useStore.setState({
          dbNotification: {
            message: `Saved locally! (Database offline/unreachable)`,
            type: "info",
          },
        });
        setTimeout(() => {
          useStore.getState().clearDbNotification();
        }, 4500);
      }
    })();

    // Reset
    setNewActivityName("");
    setNewActivityMaxPoints("");
    setNewActivityIcon("🏆");
    setNewActivityIsDaily(true);
    setNewIconSelectMode("preset");
  };

  const handleSaveActivityEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity || !editingActivity.name.trim()) return;

    const updatedAct = {
      name: editingActivity.name.trim(),
      icon: editingActivity.icon || "🏆",
      maxPoints: Number(editingActivity.maxPoints) || 10,
      isDaily: editingActivity.isDaily,
    };

    setActivities((prev) => ({
      ...prev,
      [editingActivity.key]: updatedAct,
    }));

    // Save update in Supabase
    (async () => {
      try {
        const { error } = await supabase
          .from("activities")
          .upsert({
            id: editingActivity.key,
            name: updatedAct.name,
            icon: updatedAct.icon,
            max_points: updatedAct.maxPoints,
            is_daily: updatedAct.isDaily,
          });

        if (error) {
          console.warn("Failed to upsert edited activity in Supabase:", error);
          useStore.setState({
            dbNotification: {
              message: `DB Error: ${error.message || error}`,
              type: "error",
            },
          });
        } else {
          useStore.setState({
            dbNotification: {
              message: `Database processing complete! Changes on "${updatedAct.name}" synchronized in Supabase.`,
              type: "success",
            },
          });
          setTimeout(() => {
            useStore.getState().clearDbNotification();
          }, 4500);
        }
      } catch (err) {
        console.warn("Failed to reach database to edit activity:", err);
        useStore.setState({
          dbNotification: {
            message: `Saved locally! (Database offline/unreachable)`,
            type: "info",
          },
        });
        setTimeout(() => {
          useStore.getState().clearDbNotification();
        }, 4500);
      }
    })();

    setEditingActivity(null);
  };

  const handleDeleteActivity = (key: string) => {
    triggerConfirm(
      "Delete Activity",
      `Are you sure you want to permanently delete the activity "${activities[key]?.name}"? Any recorded points for this activity will no longer be visible.`,
      () => {
        const deletedName = activities[key]?.name || "Activity";
        setActivities((prev) => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });

        // Delete from Supabase
        (async () => {
          try {
            const { error } = await supabase
              .from("activities")
              .delete()
              .eq("id", key);

            if (error) {
              console.warn("Failed to delete activity from Supabase:", error);
              useStore.setState({
                dbNotification: {
                  message: `DB Error deleting activity: ${error.message || error}`,
                  type: "error",
                },
              });
            } else {
              useStore.setState({
                dbNotification: {
                  message: `Database processing complete! Activity "${deletedName}" deleted and synchronized completely in Supabase.`,
                  type: "success",
                },
              });
              setTimeout(() => {
                useStore.getState().clearDbNotification();
              }, 4500);
            }
          } catch (err) {
            console.warn("Failed to reach database to delete activity:", err);
            useStore.setState({
              dbNotification: {
                message: `Saved locally! (Database offline/unreachable)`,
                type: "info",
              },
            });
            setTimeout(() => {
              useStore.getState().clearDbNotification();
            }, 4500);
          }
        })();
      },
    );
  };

  // Game Setup Form
  const [newGameName, setNewGameName] = useState("");
  const [newGameMax, setNewGameMax] = useState("");
  const [newGameIsTeam, setNewGameIsTeam] = useState(true);
  const [newGameIsMvp, setNewGameIsMvp] = useState(false);
  const [newGameDayId, setNewGameDayId] = useState("");
  const [newGameAllowedSubTeams, setNewGameAllowedSubTeams] = useState<
    string[]
  >(adminUserType === "team" && loggedInTeamId ? [loggedInTeamId] : []);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [teamFilterSearch, setTeamFilterSearch] = useState("");

  // Big Game inline edits
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [editGameName, setEditGameName] = useState("");
  const [editGameMax, setEditGameMax] = useState(50);
  const [editGameIsTeam, setEditGameIsTeam] = useState(true);
  const [editGameIsMvp, setEditGameIsMvp] = useState(true);
  const [editGameDayId, setEditGameDayId] = useState("default-day");
  const [editGameAllowedSubTeams, setEditGameAllowedSubTeams] = useState<
    string[]
  >([]);

  // SubGame Form
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [newSubGameName, setNewSubGameName] = useState("");
  const [newSubGameMax, setNewSubGameMax] = useState("10");

  // Sub Game inline edits
  const [editingSubGameId, setEditingSubGameId] = useState<string | null>(null);
  const [editSubGameName, setEditSubGameName] = useState("");
  const [editSubGameMax, setEditSubGameMax] = useState(10);

  // MVP Form
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerTeam, setNewPlayerTeam] = useState("");
  const [selectedParentMvp, setSelectedParentMvp] = useState("");
  const [mvpSearchQuery, setMvpSearchQuery] = useState("");

  const filteredMvpPlayers = Object.values(players).filter(
    (p) =>
      (!mvpSearchQuery.trim() ||
        p.name.toLowerCase().includes(mvpSearchQuery.toLowerCase())) &&
      (adminUserType !== "team" || !loggedInTeamId || p.teamId === loggedInTeamId),
  );

  // Collapsible Game list for scoring
  const [expandedGames, setExpandedGames] = useState<Record<string, boolean>>(
    {},
  );

  // Draft ratings scores
  const [draftScores, setDraftScores] = useState<Record<string, number | "">>(
    {},
  );

  // Local state for Global Target input editing
  const [localTargetScore, setLocalTargetScore] = useState<string>(
    eventTargetScore.toString(),
  );
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);

  // Milestone Badge recommendation engine state & helpers
  const [dismissedRecs, setDismissedRecs] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('dismissed_badge_recommendations');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleDismissRec = (teamId: string, badgeKey: string) => {
    const key = `${teamId}_${badgeKey}`;
    const updated = { ...dismissedRecs, [key]: true };
    setDismissedRecs(updated);
    localStorage.setItem('dismissed_badge_recommendations', JSON.stringify(updated));
  };

  const handleAcceptRec = (teamId: string, badgeKey: string) => {
    updateScore(teamId, badgeKey, 1);
    handleDismissRec(teamId, badgeKey);
  };

  const badgeSuggestions = useMemo(() => {
    const list: Array<{
      teamId: string;
      teamName: string;
      teamEmoji: string;
      percent: number;
      badgeKey: string;
      emoji: string;
      title: string;
      score: number;
      target: number;
    }> = [];

    const MILESTONES_CONFIG = [
      { percent: 25, title: 'Bronze 25%', emoji: '🥉', key: 'badge_25' },
      { percent: 50, title: 'Silver 50%', emoji: '🥈', key: 'badge_50' },
      { percent: 75, title: 'Gold 75%', emoji: '🥇', key: 'badge_75' },
      { percent: 100, title: 'Crown 100%', emoji: '👑', key: 'badge_100' },
    ];

    Object.values(teams).forEach((team) => {
      // Suggest badges ONLY for parent groups or autonomous teams (those with no parentId)
      const isParentOrIndependent = !team.parentId;
      
      if (!isParentOrIndependent) return;

      const score = calculateTeamScore(team, games);
      const progress = eventTargetScore > 0 ? (score / eventTargetScore) * 100 : 0;

      MILESTONES_CONFIG.forEach((m) => {
        if (progress >= m.percent) {
          const hasBadge = team.scores?.[m.key] === 1;
          if (!hasBadge) {
            const key = `${team.id}_${m.key}`;
            if (!dismissedRecs[key]) {
              list.push({
                teamId: team.id,
                teamName: team.nameAr || team.id,
                teamEmoji: team.emojis || "🎪",
                percent: m.percent,
                badgeKey: m.key,
                emoji: m.emoji,
                title: m.title,
                score,
                target: eventTargetScore
              });
            }
          }
        }
      });
    });

    return list;
  }, [teams, games, eventTargetScore, dismissedRecs]);

  useEffect(() => {
    setLocalTargetScore(eventTargetScore.toString());
  }, [eventTargetScore]);

  const handleSaveTargetScore = () => {
    const parsed = parseInt(localTargetScore, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setEventTargetScore(parsed);
      setShowSaveFeedback(true);
      setTimeout(() => setShowSaveFeedback(false), 3000);
    }
  };

  // Confirm Modal state controller
  const [confirmProps, setConfirmProps] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmBtnClassName?: string;
    cancelBtnClassName?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel?: string,
    cancelLabel?: string,
    confirmBtnClassName?: string,
    cancelBtnClassName?: string,
  ) => {
    setConfirmProps({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmLabel,
      cancelLabel,
      confirmBtnClassName,
      cancelBtnClassName,
    });
  };

  const handleCreateDay = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedDate = newDayDate || new Date().toISOString().split("T")[0];
    const defaultName = `Day ${formattedDate}`;
    const displayName = newDayName.trim() || defaultName;

    triggerConfirm(
      "Create New Day",
      `Are you sure you want to create a new day named "${displayName}" with date (${formattedDate})?`,
      () => {
        const dId = addDay(displayName, formattedDate);
        setSelectedDayId(dId);
        setNewGameDayId(dId);
        setNewDayName("");
      },
    );
  };

  const handleDeleteDayClick = (dayId: string, dayName: string) => {
    triggerConfirm(
      "Delete Day",
      `Are you sure you want to delete day "${dayName}"? Warning: All associated games and scores will be permanently deleted and cannot be recovered!`,
      () => {
        deleteDay(dayId);
      },
    );
  };

  const startEditingGame = (game: any) => {
    setEditingGameId(game.id);
    setEditGameName(game.name);
    setEditGameMax(game.maxPoints);
    setEditGameIsTeam(game.isTeamScoring !== false);
    setEditGameIsMvp(game.isMvpScoring !== false);
    setEditGameDayId(game.dayId || "default-day");
    setEditGameAllowedSubTeams(game.allowedSubTeamIds || []);
  };

  const startEditingSubGame = (sg: any) => {
    setEditingSubGameId(sg.id);
    setEditSubGameName(sg.name);
    setEditSubGameMax(sg.maxPoints);
  };

  const handleSaveEditGame = (gameId: string) => {
    if (editGameName.trim()) {
      triggerConfirm(
        "Save Game Changes",
        `Are you sure you want to save modifications to the game "${editGameName.trim()}"?`,
        () => {
          editGame(
            gameId,
            editGameName.trim(),
            editGameMax,
            editGameIsTeam,
            editGameIsMvp,
            editGameAllowedSubTeams,
          );
          // Shift day structure manually if game has dayId
          useStore.setState((state) => ({
            games: state.games.map((g) =>
              g.id === gameId ? { ...g, dayId: editGameDayId } : g,
            ),
          }));
          setEditingGameId(null);
        },
      );
    }
  };

   const renderAllowedSubTeamsEditBlock = () => {
    const nehemiahSubTeams = Object.values(teams).filter(
      (t) =>
        t.parentId === "Awlad_Na7mya" &&
        (adminUserType !== "team" || !loggedInTeamId || t.id === loggedInTeamId)
    );
    const noahSubTeams = Object.values(teams).filter(
      (t) =>
        t.parentId === "Noo7_&Shorakah" &&
        (adminUserType !== "team" || !loggedInTeamId || t.id === loggedInTeamId)
    );

    if (nehemiahSubTeams.length === 0 && noahSubTeams.length === 0) return null;

    return (
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 mb-4 select-none">
        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
          Allowed Sub-Teams (Optional: Leave blank for all sub-teams to play)
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nehemiahSubTeams.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-indigo-700 pb-1 border-b border-indigo-150 flex items-center gap-1 font-sansArabic">
                <span>🏗️</span>
                <span>{teams.Awlad_Na7mya?.nameAr || "أولاد نحميا للمقاولات"}</span>
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                {nehemiahSubTeams.map((t) => {
                  const isChecked = editGameAllowedSubTeams.includes(t.id);
                  return (
                    <label
                       key={t.id}
                       className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditGameAllowedSubTeams((prev) => [
                              ...prev,
                              t.id,
                            ]);
                          } else {
                            setEditGameAllowedSubTeams((prev) =>
                              prev.filter((id) => id !== t.id),
                            );
                          }
                        }}
                        className="rounded text-indigo-650 h-3.5 w-3.5"
                      />
                      <span className="font-sansArabic">{t.nameAr}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {noahSubTeams.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-amber-700 pb-1 border-b border-amber-150 flex items-center gap-1 font-sansArabic">
                <span>🚢</span>
                <span>{teams["Noo7_&Shorakah"]?.nameAr || "نوح وشركاؤه للملاحة"}</span>
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                {noahSubTeams.map((t) => {
                  const isChecked = editGameAllowedSubTeams.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditGameAllowedSubTeams((prev) => [
                              ...prev,
                              t.id,
                            ]);
                          } else {
                            setEditGameAllowedSubTeams((prev) =>
                              prev.filter((id) => id !== t.id),
                            );
                          }
                        }}
                        className="rounded text-indigo-650 h-3.5 w-3.5"
                      />
                      <span className="font-sansArabic">{t.nameAr}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSaveEditSubGame = (gameId: string, subGameId: string) => {
    if (editSubGameName.trim()) {
      triggerConfirm(
        "Save Subgame Changes",
        `Are you sure you want to save modifications to the sub-game "${editSubGameName.trim()}"?`,
        () => {
          editSubGame(
            gameId,
            subGameId,
            editSubGameName.trim(),
            editSubGameMax,
          );
          setEditingSubGameId(null);
        },
      );
    }
  };

  const handleSaveEditDay = (dayId: string) => {
    if (editDayName.trim()) {
      editDay(dayId, editDayName.trim());
      setEditingDayId(null);
    }
  };

  const handleAddGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameDayId) {
      setGameDayError(
        "⚠️ Please choose a Day! You must select which day this game belongs to before saving.",
      );
      return;
    }
    setGameDayError(null);
    if (newGameName.trim() && !isNaN(Number(newGameMax))) {
      triggerConfirm(
        "Create Game",
        `Are you sure you want to add a new game "${newGameName.trim()}" with points limit ${newGameMax}?`,
        () => {
          addGame(
            newGameName.trim(),
            Number(newGameMax) || 0,
            newGameIsTeam,
            newGameIsMvp,
            newGameDayId,
            newGameAllowedSubTeams,
          );
          setNewGameName("");
          setNewGameMax("");
          setNewGameIsTeam(true);
          setNewGameIsMvp(false);
          setNewGameDayId("");
          setNewGameAllowedSubTeams(adminUserType === "team" && loggedInTeamId ? [loggedInTeamId] : []);
        },
      );
    }
  };

  const handleAddSubGame = (e: React.FormEvent, gameId: string) => {
    e.preventDefault();
    if (newSubGameName.trim() && !isNaN(Number(newSubGameMax))) {
      triggerConfirm(
        "Add Subgame",
        `Are you sure you want to add sub-game "${newSubGameName.trim()}"?`,
        () => {
          addSubGame(gameId, newSubGameName.trim(), Number(newSubGameMax));
          setNewSubGameName("");
          setNewSubGameMax("10");
          setActiveGameId(null);
        },
      );
    }
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      const targetTeamId =
        adminUserType === "team" ? loggedInTeamId || "" : newPlayerTeam;
      const teamLabel =
        targetTeamId && teams[targetTeamId]
          ? ` (${teams[targetTeamId].nameAr})`
          : "";
      triggerConfirm(
        "Create Player",
        `Are you sure you want to add player "${newPlayerName.trim()}"${teamLabel} to the tournament roster?`,
        () => {
          addPlayer(newPlayerName.trim(), targetTeamId);
          setNewPlayerName("");
          setNewPlayerTeam("");
          setSelectedParentMvp("");
        },
      );
    }
  };

  const handleDeleteGameClick = (gameId: string, gameName: string) => {
    triggerConfirm(
      "Delete Game",
      `Are you sure you want to delete the game "${gameName}" and clean all team scores associated with it?`,
      () => {
        deleteGame(gameId);
      },
    );
  };

  const handleDeleteSubGameClick = (
    gameId: string,
    subGameId: string,
    subGameName: string,
  ) => {
    triggerConfirm(
      "Delete Subgame",
      `Are you sure you want to delete the sub-game "${subGameName}"?`,
      () => {
        deleteSubGame(gameId, subGameId);
      },
    );
  };

  const handleDeletePlayerClick = (playerId: string, playerName: string) => {
    triggerConfirm(
      "Delete Player",
      `Are you sure you want to delete player "${playerName}"?`,
      () => {
        deletePlayer(playerId);
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 w-full font-sans pb-20">
      <div className="max-w-5xl mx-auto">
        {/* Switch back button */}
        <button
          onClick={onBack}
          className="mb-8 px-5 py-2.5 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all text-sm font-semibold text-slate-700 cursor-pointer flex items-center gap-2 font-sans"
        >
          <span>←</span> Portal Hub
        </button>

        {/* Title area */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0D253F] tracking-tight mb-1.5 font-sans">
              Admin Dashboard
            </h1>
            <p className="text-slate-500 font-medium text-sm sm:text-base">
              Configure challenges, record scores, and track players securely.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Target Score block in the header */}
            <div className="bg-white p-3.5 px-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 animate-in fade-in duration-200">
              <div className="text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">
                  🎯 Target Score / المستهدف
                </span>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="number"
                    value={localTargetScore}
                    onChange={(e) => {
                      setLocalTargetScore(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveTargetScore();
                      }
                    }}
                    className="w-24 px-2 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono text-sm font-black text-slate-800 text-center bg-slate-50"
                  />
                  <span className="text-xs font-bold text-slate-500 mr-2">PTS</span>
                  
                  <button
                    type="button"
                    onClick={handleSaveTargetScore}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer select-none border",
                      showSaveFeedback
                        ? "bg-emerald-500 text-white border-transparent shadow-xs"
                        : localTargetScore !== eventTargetScore.toString() && localTargetScore.trim() !== ""
                          ? "bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-300 shadow-sm scale-102"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200/60"
                    )}
                  >
                    {showSaveFeedback ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {adminUserType === "super" ? null : (
              loggedInTeamId &&
              teams[loggedInTeamId] && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 sm:p-3.5 rounded-2xl flex items-center gap-3 animate-in slide-in-from-right duration-250 shadow-xs max-w-sm">
                  <span className="text-3xl select-none shrink-0">
                    {teams[loggedInTeamId].emojis}
                  </span>
                  <div className="text-left min-w-0">
                    <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block leading-none mb-1">
                      👑 Scoped Team Portal
                    </span>
                    <span className="font-extrabold text-[#0F172A] text-sm font-sansArabic block truncate">
                      {teams[loggedInTeamId].nameAr}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Milestone Badge Recommendation Widget */}
        <AnimatePresence>
          {badgeSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="mb-8 p-5 bg-gradient-to-br from-amber-500/10 via-slate-50 to-amber-500/5 rounded-3xl border border-amber-300/60 shadow-[0_4px_24px_rgba(245,158,11,0.08)] flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300"
            >
              <div className="flex justify-between items-center pb-2 border-b border-amber-200/40">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl animate-bounce">🔔</span>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-amber-800 tracking-tight font-sans uppercase">
                      Milestone Badge Recommendations / مقترحات منح الأوسمة الموصى بها
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                      These groups reached milestone goals. Grant their official badge or dismiss the recommendation below:
                    </p>
                  </div>
                </div>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                  {badgeSuggestions.length} PENDING / قيد الانتظار
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {badgeSuggestions.map((rec) => {
                  const key = `${rec.teamId}_${rec.badgeKey}`;
                  return (
                    <motion.div
                      key={key}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", damping: 20 }}
                      className="bg-white p-4 rounded-2xl border border-amber-200/50 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden group hover:shadow-md transition-all duration-200"
                    >
                      {/* Thin side gold highlight bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                      
                      <div className="flex items-center gap-3 pl-1 min-w-0">
                        <span className="text-2xl select-none shrink-0" role="img">
                          {rec.teamEmoji}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-800 text-sm font-sansArabic truncate">
                            {rec.teamName}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-850 border border-amber-200/40">
                              <span>{rec.emoji}</span>
                              <span>{rec.title}</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold whitespace-nowrap">
                              ({Math.round((rec.score / rec.target) * 100)}% - {rec.score} PTS)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDismissRec(rec.teamId, rec.badgeKey)}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition duration-150 cursor-pointer select-none"
                          title="Ignore / تجاهل"
                        >
                          <span>Reject / رفض</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptRec(rec.teamId, rec.badgeKey)}
                          className="px-3.5 py-1.5 rounded-lg text-[10px] font-black bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-300 shadow-sm transition duration-150 cursor-pointer select-none hover:scale-102 active:scale-98 flex items-center gap-1"
                        >
                          <span>Accept / موافقة</span>
                          <Check className="w-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Selection */}
        <div className="flex bg-white rounded-[16px] p-1.5 shadow-sm border border-slate-200 mb-8 max-w-fit overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            onClick={() => {
              setDraftScores({});
              setActiveTab("scoring");
            }}
            className={cn(
              "px-6 py-2.5 rounded-[12px] text-sm font-bold transition cursor-pointer",
              activeTab === "scoring"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            Team Scoring
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftScores({});
              setActiveTab("badges");
            }}
            className={cn(
              "px-6 py-2.5 rounded-[12px] text-sm font-bold transition cursor-pointer flex items-center gap-1.5",
              activeTab === "badges"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            <span>🏅</span> Team Badges
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftScores({});
              setActiveTab("activities");
            }}
            className={cn(
              "px-6 py-2.5 rounded-[12px] text-sm font-bold transition cursor-pointer flex items-center gap-1.5",
              activeTab === "activities"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            <span>🎪</span> Other Activities
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftScores({});
              setActiveTab("mvp");
            }}
            className={cn(
              "px-6 py-2.5 rounded-[12px] text-sm font-bold transition cursor-pointer",
              activeTab === "mvp"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            MVP Scoring
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftScores({});
              setActiveTab("leaderboard");
            }}
            className={cn(
              "px-6 py-2.5 rounded-[12px] text-sm font-bold transition cursor-pointer flex items-center gap-1.5",
              activeTab === "leaderboard"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            <span>🏆</span> Standings
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftScores({});
              setActiveTab("settings");
            }}
            className={cn(
              "px-6 py-2.5 rounded-[12px] text-sm font-bold transition cursor-pointer flex items-center gap-1.5",
              activeTab === "settings"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            <Key size={14} /> <span>Settings</span>
          </button>
        </div>

        {/* tab CONTENT: setup */}
        {activeTab === "setup" && (
          <div className="space-y-8 animate-in fade-in-50 duration-200">
            {/* Day Management Section */}
            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 tracking-tight flex items-center gap-2">
                <Calendar size={20} className="text-indigo-500" />
                <span>Days Setup</span>
              </h2>

              <p className="text-slate-500 text-xs mb-6 font-medium">
                Create and structure dates of the tournament to group challenge
                packages.
              </p>

              {/* Day Creation Form */}
              <form
                onSubmit={handleCreateDay}
                className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200 border-dashed mb-6"
              >
                <div className="w-full sm:flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Day Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newDayName}
                    onChange={(e) => setNewDayName(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                    placeholder="e.g. Day 1, Opening Day, Friday"
                  />
                </div>
                <div className="w-full sm:w-64">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDayDate}
                    onChange={(e) => setNewDayDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-400 font-mono"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-[#0F172A] text-white px-5 py-2 rounded-lg font-semibold hover:bg-slate-800 transition whitespace-nowrap h-[42px] cursor-pointer text-xs flex items-center gap-1.5 justify-center"
                >
                  <Plus size={14} /> Add Day
                </button>
              </form>

              {/* Day Listing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(days).map((day) => (
                  <div
                    key={day.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-3 w-full mr-2">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <Calendar size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingDayId === day.id ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editDayName}
                              onChange={(e) => setEditDayName(e.target.value)}
                              className="bg-white border border-amber-400 p-1 px-2 rounded-lg text-xs font-bold text-slate-850 focus:outline-none flex-1 min-w-0"
                              placeholder="Day name"
                              autoFocus
                              required
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditDay(day.id)}
                              className="p-1 px-2 rounded bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition flex items-center gap-0.5 whitespace-nowrap cursor-pointer select-none shrink-0"
                            >
                              <Check size={11} /> Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDayId(null)}
                              className="p-1 px-2 rounded bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 transition cursor-pointer select-none shrink-0"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className="font-bold text-slate-800 text-sm block truncate"
                              title={day.name}
                            >
                              {day.name}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {day.date}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    {editingDayId !== day.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingDayId(day.id);
                            setEditDayName(day.name);
                          }}
                          className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Day Name"
                        >
                          <Pencil size={15} />
                        </button>
                        {day.id !== "default-day" && (
                          <button
                            onClick={() =>
                              handleDeleteDayClick(day.id, day.name)
                            }
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Day"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Main Games Setup */}
            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-6 tracking-tight flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                <span>Main Games Details</span>
              </h2>

              <div className="space-y-8 mb-8">
                {games.length === 0 && (
                  <p className="text-slate-400 italic text-sm">
                    No games created yet.
                  </p>
                )}

                {Object.values(days).map((day) => {
                  const dayGames = games.filter((g) => g.dayId === day.id);
                  if (dayGames.length === 0) return null;

                  return (
                    <div
                      key={day.id}
                      className="space-y-4 animate-in fade-in-50 duration-250"
                    >
                      {/* Day Heading */}
                      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                        <Calendar size={15} className="text-indigo-600" />
                        <h3 className="text-xs font-black text-slate-700 tracking-wider uppercase">
                          {day.name}{" "}
                          <span className="text-slate-400 font-normal font-mono text-[11px]">
                            ({day.date})
                          </span>
                        </h3>
                        <span className="ml-auto bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                          {dayGames.length}{" "}
                          {dayGames.length === 1 ? "game" : "games"}
                        </span>
                      </div>

                      <div className="grid gap-4">
                        {dayGames.map((game) => {
                          const subGamesTotal = game.subGames.reduce(
                            (acc, curr) => acc + curr.maxPoints,
                            0,
                          );
                          const displayMax =
                            game.subGames.length > 0
                              ? subGamesTotal
                              : game.maxPoints;
                          const isEditingThisGame = editingGameId === game.id;
                          const associatedDay = days[
                            game.dayId || "default-day"
                          ] || { name: "Unassigned", date: "" };

                          return (
                            <div
                              key={game.id}
                              className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-100"
                            >
                              {isEditingThisGame ? (
                                <div className="p-5 bg-amber-50/40 border-b border-slate-200">
                                  <h3 className="text-sm font-bold text-amber-800 mb-3 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                                    <Pencil
                                      size={14}
                                      className="text-amber-500"
                                    />{" "}
                                    Edit Game Details
                                  </h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-550 mb-1 uppercase tracking-wider">
                                        Game Name
                                      </label>
                                      <input
                                        type="text"
                                        value={editGameName}
                                        onChange={(e) =>
                                          setEditGameName(e.target.value)
                                        }
                                        className="w-full bg-white border border-slate-300 focus:border-amber-400 p-2 rounded-lg text-sm focus:outline-none"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-550 mb-1 uppercase tracking-wider">
                                        Max Points
                                      </label>
                                      <input
                                        type="number"
                                        value={editGameMax}
                                        onChange={(e) =>
                                          setEditGameMax(
                                            Number(e.target.value) || 0,
                                          )
                                        }
                                        className="w-full bg-white border border-slate-300 focus:border-amber-400 p-2 rounded-lg text-sm focus:outline-none"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-550 mb-1 uppercase tracking-wider">
                                        Associated Day
                                      </label>
                                      <select
                                        value={editGameDayId}
                                        onChange={(e) =>
                                          setEditGameDayId(e.target.value)
                                        }
                                        className="w-full bg-white border border-slate-300 focus:border-amber-400 p-2 rounded-lg text-sm focus:outline-none"
                                      >
                                        <option value="">
                                          Unassigned (Lonely Game)
                                        </option>
                                        {Object.values(days).map((d) => (
                                          <option key={d.id} value={d.id}>
                                            {d.name} ({d.date})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-6 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 text-xs select-none">
                                      <input
                                        type="checkbox"
                                        checked={editGameIsTeam}
                                        onChange={(e) =>
                                          setEditGameIsTeam(e.target.checked)
                                        }
                                        className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
                                      />
                                      Include in Team Progress (The Building)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 text-xs select-none">
                                      <input
                                        type="checkbox"
                                        checked={editGameIsMvp}
                                        onChange={(e) =>
                                          setEditGameIsMvp(e.target.checked)
                                        }
                                        className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
                                      />
                                      Include in MVP/Personal Scoring
                                    </label>
                                  </div>

                                  {renderAllowedSubTeamsEditBlock()}

                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSaveEditGame(game.id)
                                      }
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check size={14} /> Save Changes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingGameId(null)}
                                      className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <X size={14} /> Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-slate-50/70 p-4 border-b border-slate-200/60 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                  <div>
                                    <div className="font-bold text-slate-850 text-base sm:text-lg flex flex-wrap items-center gap-2">
                                      <span>{game.name}</span>
                                      <div className="flex gap-1">
                                        {game.isTeamScoring !== false && (
                                          <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Team scoring
                                          </span>
                                        )}
                                        {game.isMvpScoring !== false && (
                                          <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            MVP scoring
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-[11px] font-bold uppercase tracking-widest mt-1 text-slate-400">
                                      <span className="text-blue-600">
                                        Max Points: {game.maxPoints}
                                      </span>
                                      {game.subGames.length > 0 && (
                                        <>
                                          <span className="text-slate-300 ml-2 mr-2">
                                            |
                                          </span>
                                          <span className="text-rose-600 font-extrabold">
                                            Remaining Points:{" "}
                                            <span className="text-rose-600 font-black text-sm">
                                              {game.maxPoints - subGamesTotal}
                                            </span>
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditingGame(game)}
                                      className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                                    >
                                      <Pencil size={12} /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveGameId(
                                          activeGameId === game.id
                                            ? null
                                            : game.id,
                                        )
                                      }
                                      className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                                    >
                                      + Sub-Game
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteGameClick(
                                          game.id,
                                          game.name,
                                        )
                                      }
                                      className="text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                                    >
                                      Delete Game
                                    </button>
                                  </div>
                                </div>
                              )}

                              {activeGameId === game.id && (
                                <form
                                  onSubmit={(e) => handleAddSubGame(e, game.id)}
                                  className="p-4 bg-indigo-50/50 flex flex-col sm:flex-row gap-3 items-end border-b border-slate-200"
                                >
                                  <div className="w-full">
                                    <label className="block text-[10px] font-bold text-slate-550 mb-1.5 uppercase tracking-widest">
                                      Sub-Game Name
                                    </label>
                                    <input
                                      type="text"
                                      value={newSubGameName}
                                      onChange={(e) =>
                                        setNewSubGameName(e.target.value)
                                      }
                                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                                      placeholder="e.g. Round 1"
                                      required
                                    />
                                  </div>
                                  <div className="w-32">
                                    <label className="block text-[10px] font-bold text-slate-550 mb-1.5 uppercase tracking-widest">
                                      Points Limit
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={newSubGameMax}
                                      onChange={(e) =>
                                        setNewSubGameMax(e.target.value)
                                      }
                                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                                      required
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer mb-[1px] whitespace-nowrap h-[38px]"
                                  >
                                    Add Sub-Game
                                  </button>
                                </form>
                              )}

                              {game.subGames.length > 0 && (
                                <div className="p-4 border-t border-slate-100">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                    Sub-Games breakdown
                                  </h4>
                                  <div className="flex flex-col gap-2">
                                    {game.subGames.map((sg) => {
                                      const isEditingSub =
                                        editingSubGameId === sg.id;

                                      return (
                                        <div
                                          key={sg.id}
                                          className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 min-h-[50px]"
                                        >
                                          {isEditingSub ? (
                                            <div className="flex-1 flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                                              <div className="flex-1 w-full">
                                                <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider mb-0.5">
                                                  Edit Sub-Game Name
                                                </label>
                                                <input
                                                  type="text"
                                                  value={editSubGameName}
                                                  onChange={(e) =>
                                                    setEditSubGameName(
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="w-full bg-white border border-slate-300 px-2.5 py-1 rounded text-sm focus:outline-none focus:border-amber-400 font-medium"
                                                  required
                                                />
                                              </div>
                                              <div className="w-24">
                                                <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider mb-0.5">
                                                  Points Limit
                                                </label>
                                                <input
                                                  type="number"
                                                  value={editSubGameMax}
                                                  onChange={(e) =>
                                                    setEditSubGameMax(
                                                      Number(e.target.value) ||
                                                        0,
                                                    )
                                                  }
                                                  className="w-full bg-white border border-slate-300 px-2.5 py-1 rounded text-sm focus:outline-none focus:border-amber-400 font-mono font-bold"
                                                  required
                                                />
                                              </div>
                                              <div className="flex gap-1 mb-[1px]">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleSaveEditSubGame(
                                                      game.id,
                                                      sg.id,
                                                    )
                                                  }
                                                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded transition cursor-pointer"
                                                >
                                                  <Check size={14} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setEditingSubGameId(null)
                                                  }
                                                  className="bg-slate-400 hover:bg-slate-500 text-white p-2 rounded transition cursor-pointer"
                                                >
                                                  <X size={14} />
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <span className="text-sm font-semibold text-slate-700">
                                                {sg.name}{" "}
                                                <span className="text-orange-500 ml-2 font-bold">
                                                  (Max: {sg.maxPoints})
                                                </span>
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    startEditingSubGame(sg)
                                                  }
                                                  className="bg-amber-400 hover:bg-amber-500 text-slate-900 p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                                                  title="Edit Subgame Name or Points"
                                                >
                                                  <Pencil size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleDeleteSubGameClick(
                                                      game.id,
                                                      sg.id,
                                                      sg.name,
                                                    )
                                                  }
                                                  className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2.5 py-1 rounded transition cursor-pointer animate-in"
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Unassigned / Lonely Games Section */}
                {(() => {
                  const unassignedGames = games.filter(
                    (g) => !g.dayId || !days[g.dayId],
                  );
                  if (unassignedGames.length === 0) return null;

                  return (
                    <div className="space-y-4 pt-6 border-t border-slate-200 border-dashed animate-in fade-in-50 duration-250">
                      <div className="flex items-center gap-2 pb-2">
                        <span className="text-lg">❔</span>
                        <h3 className="text-xs font-black text-amber-600 tracking-wider uppercase">
                          Unassigned / Lonely Games{" "}
                          <span className="text-slate-400 font-normal font-mono text-[11px]">
                            (No Day linked)
                          </span>
                        </h3>
                        <span className="ml-auto bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono font-sans">
                          {unassignedGames.length}{" "}
                          {unassignedGames.length === 1 ? "game" : "games"}
                        </span>
                      </div>

                      <div className="grid gap-4">
                        {unassignedGames.map((game) => {
                          const subGamesTotal = game.subGames.reduce(
                            (acc, curr) => acc + curr.maxPoints,
                            0,
                          );
                          const displayMax =
                            game.subGames.length > 0
                              ? subGamesTotal
                              : game.maxPoints;
                          const isEditingThisGame = editingGameId === game.id;

                          return (
                            <div
                              key={game.id}
                              className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-100"
                            >
                              {isEditingThisGame ? (
                                <div className="p-5 bg-amber-50/40 border-b border-slate-200 font-medium">
                                  <h3 className="text-sm font-bold text-amber-800 mb-3 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                                    <Pencil
                                      size={14}
                                      className="text-amber-500"
                                    />{" "}
                                    Edit Game Details
                                  </h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                        Game Name
                                      </label>
                                      <input
                                        type="text"
                                        value={editGameName}
                                        onChange={(e) =>
                                          setEditGameName(e.target.value)
                                        }
                                        className="w-full bg-white border border-slate-300 focus:border-amber-400 p-2 rounded-lg text-sm focus:outline-none font-sans font-medium"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                        Max Points
                                      </label>
                                      <input
                                        type="number"
                                        value={editGameMax}
                                        onChange={(e) =>
                                          setEditGameMax(
                                            Number(e.target.value) || 0,
                                          )
                                        }
                                        className="w-full bg-white border border-slate-300 focus:border-amber-400 p-2 rounded-lg text-sm focus:outline-none font-sans font-medium"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                        Associated Day
                                      </label>
                                      <select
                                        value={editGameDayId}
                                        onChange={(e) =>
                                          setEditGameDayId(e.target.value)
                                        }
                                        className="w-full bg-white border border-slate-300 focus:border-amber-400 p-2 rounded-lg text-sm focus:outline-none font-sans font-medium"
                                      >
                                        <option value="">
                                          Unassigned (Lonely Game)
                                        </option>
                                        {Object.values(days).map((d) => (
                                          <option key={d.id} value={d.id}>
                                            {d.name} ({d.date})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-6 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 text-xs select-none">
                                      <input
                                        type="checkbox"
                                        checked={editGameIsTeam}
                                        onChange={(e) =>
                                          setEditGameIsTeam(e.target.checked)
                                        }
                                        className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
                                      />
                                      Include in Team Progress (The Building)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 text-xs select-none">
                                      <input
                                        type="checkbox"
                                        checked={editGameIsMvp}
                                        onChange={(e) =>
                                          setEditGameIsMvp(e.target.checked)
                                        }
                                        className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
                                      />
                                      Include in MVP/Personal Scoring
                                    </label>
                                  </div>

                                  {renderAllowedSubTeamsEditBlock()}

                                  <div className="flex justify-end gap-2 font-sans font-semibold">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSaveEditGame(game.id)
                                      }
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check size={14} /> Save Changes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingGameId(null)}
                                      className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <X size={14} /> Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-bold text-slate-800 text-base">
                                        {game.name}
                                      </h4>
                                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                        Max Points: {displayMax}
                                      </span>
                                      {game.subGames.length > 0 && (
                                        <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                          {game.subGames.length} Sub-challenges
                                        </span>
                                      )}
                                      <span className="bg-amber-50 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-amber-200">
                                        Lonely Game
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 font-semibold">
                                      <span className="flex items-center gap-1 text-[11px]">
                                        🎯 Scopes:
                                      </span>
                                      <span
                                        className={cn(
                                          "px-2 py-0.5 rounded text-[10px] font-bold border",
                                          game.isTeamScoring !== false
                                            ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                                            : "text-slate-400 bg-slate-50 border-slate-100",
                                        )}
                                      >
                                        Team Building
                                      </span>
                                      <span
                                        className={cn(
                                          "px-2 py-0.5 rounded text-[10px] font-bold border",
                                          game.isMvpScoring !== false
                                            ? "text-sky-700 bg-sky-50 border-sky-100"
                                            : "text-slate-400 bg-slate-50 border-slate-100",
                                        )}
                                      >
                                        Personal MVP
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingGameId(game.id);
                                        setEditGameName(game.name);
                                        setEditGameMax(game.maxPoints);
                                        setEditGameIsTeam(
                                          game.isTeamScoring !== false,
                                        );
                                        setEditGameIsMvp(
                                          game.isMvpScoring !== false,
                                        );
                                        setEditGameDayId(game.dayId || "");
                                      }}
                                      className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                      title="Edit game info"
                                    >
                                      <Pencil size={13} />
                                      <span>Edit info</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveGameId(
                                          activeGameId === game.id
                                            ? null
                                            : game.id,
                                        );
                                        setNewSubGameName("");
                                        setNewSubGameMax("10");
                                      }}
                                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer"
                                    >
                                      {activeGameId === game.id
                                        ? "Close"
                                        : "+ Add Subgame"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteGameClick(
                                          game.id,
                                          game.name,
                                        )
                                      }
                                      className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-3.5 py-2 rounded-lg transition cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}

                              {activeGameId === game.id && (
                                <form
                                  onSubmit={(e) => handleAddSubGame(e, game.id)}
                                  className="p-4 bg-indigo-50/50 flex flex-col sm:flex-row gap-3 items-end border-b border-slate-200"
                                >
                                  <div className="w-full">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                                      Sub-Game Name
                                    </label>
                                    <input
                                      type="text"
                                      value={newSubGameName}
                                      onChange={(e) =>
                                        setNewSubGameName(e.target.value)
                                      }
                                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:border-indigo-400 font-medium"
                                      placeholder="e.g. Round 1"
                                      required
                                    />
                                  </div>
                                  <div className="w-32">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                                      Points Limit
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={newSubGameMax}
                                      onChange={(e) =>
                                        setNewSubGameMax(e.target.value)
                                      }
                                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:border-indigo-400 font-medium font-mono"
                                      required
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer mb-[1px] whitespace-nowrap h-[38px] font-sans font-semibold"
                                  >
                                    Add Sub-Game
                                  </button>
                                </form>
                              )}

                              {game.subGames.length > 0 && (
                                <div className="p-4 border-t border-slate-100 font-sans">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                    Sub-Games breakdown
                                  </h4>
                                  <div className="flex flex-col gap-2">
                                    {game.subGames.map((sg) => {
                                      const isEditingSub =
                                        editingSubGameId === sg.id;

                                      return (
                                        <div
                                          key={sg.id}
                                          className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 min-h-[50px]"
                                        >
                                          {isEditingSub ? (
                                            <div className="flex-1 flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                                              <div className="flex-1 w-full">
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                                  Edit Sub-Game Name
                                                </label>
                                                <input
                                                  type="text"
                                                  value={editSubGameName}
                                                  onChange={(e) =>
                                                    setEditSubGameName(
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="w-full bg-white border border-slate-300 px-2.5 py-1 rounded text-sm focus:outline-none focus:border-amber-400 font-medium font-sans"
                                                  required
                                                />
                                              </div>
                                              <div className="w-24">
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                                  Points Limit
                                                </label>
                                                <input
                                                  type="number"
                                                  value={editSubGameMax}
                                                  onChange={(e) =>
                                                    setEditSubGameMax(
                                                      Number(e.target.value) ||
                                                        0,
                                                    )
                                                  }
                                                  className="w-full bg-white border border-slate-300 px-2.5 py-1 rounded text-sm focus:outline-none focus:border-amber-400 font-mono font-bold font-sans"
                                                  required
                                                />
                                              </div>
                                              <div className="flex gap-1 mb-[1px]">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleSaveEditSubGame(
                                                      game.id,
                                                      sg.id,
                                                    )
                                                  }
                                                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded transition cursor-pointer"
                                                >
                                                  <Check size={14} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setEditingSubGameId(null)
                                                  }
                                                  className="bg-slate-400 hover:bg-slate-500 text-white p-2 rounded transition cursor-pointer"
                                                >
                                                  <X size={14} />
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <span className="text-sm font-semibold text-slate-700">
                                                {sg.name}{" "}
                                                <span className="text-orange-500 ml-2 font-bold">
                                                  (Max: {sg.maxPoints})
                                                </span>
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    startEditingSubGame(sg)
                                                  }
                                                  className="bg-amber-400 hover:bg-amber-550 text-slate-900 p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                                                  title="Edit Subgame Name or Points"
                                                >
                                                  <Pencil size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleDeleteSubGameClick(
                                                      game.id,
                                                      sg.id,
                                                      sg.name,
                                                    )
                                                  }
                                                  className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2.5 py-1 rounded transition cursor-pointer animate-in"
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Add New Game Form */}
              <form
                onSubmit={handleAddGame}
                className="flex flex-col bg-slate-50 p-6 rounded-[16px] border border-slate-200 border-dashed gap-4"
              >
                <div className="flex flex-col sm:flex-row gap-4 items-end w-full">
                  <div className="w-full sm:flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                      Create New Big Game
                    </label>
                    <input
                      type="text"
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-3 rounded-lg focus:outline-none focus:border-slate-400 text-sm"
                      placeholder="e.g., Target Shoot, Puzzle Solving"
                      required
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                      Max Points
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newGameMax}
                      onChange={(e) => setNewGameMax(e.target.value)}
                      placeholder="Enter points"
                      className="w-full bg-white border border-slate-200 p-3 rounded-lg focus:outline-none focus:border-slate-400 text-sm"
                      required
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                      Link to Day
                    </label>
                    <select
                      value={newGameDayId}
                      onChange={(e) => {
                        setNewGameDayId(e.target.value);
                        if (e.target.value) setGameDayError(null);
                      }}
                      className={cn(
                        "w-full bg-white border p-3 rounded-lg focus:outline-none text-sm transition font-medium",
                        gameDayError
                          ? "border-red-400 focus:border-red-500 bg-red-50/20"
                          : "border-slate-200 focus:border-slate-400",
                      )}
                    >
                      <option value="">-- Choose Day --</option>
                      {Object.values(days).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {gameDayError && (
                  <div className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-200/50 animate-pulse flex items-center gap-1.5">
                    <span>⚠️</span> {gameDayError}
                  </div>
                )}

                <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-6 max-w-fit">
                  <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center">
                    TARGET MODULES:
                  </span>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-700 text-xs select-none">
                    <input
                      type="checkbox"
                      checked={newGameIsTeam}
                      onChange={(e) => setNewGameIsTeam(e.target.checked)}
                      className="rounded text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                    />
                    Include in Team Progress (The Building)
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-700 text-xs select-none">
                    <input
                      type="checkbox"
                      checked={newGameIsMvp}
                      onChange={(e) => setNewGameIsMvp(e.target.checked)}
                      className="rounded text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                    />
                    Include in MVP/Personal Score
                  </label>
                </div>

                {/* Custom Multi-Select Allowed Sub-Teams */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 relative w-full">
                  <div className="flex justify-between items-center">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Allowed Sub-Teams (Optional: Leave blank for all sub-teams to play)
                    </span>
                    {newGameAllowedSubTeams.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewGameAllowedSubTeams([])}
                        className="text-[10px] font-bold text-red-600 hover:text-red-800 transition cursor-pointer"
                      >
                        Reset to All Teams
                      </button>
                    )}
                  </div>

                  {/* Trigger Button & Selected Status Box */}
                  <div 
                    onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-350 p-3 rounded-xl cursor-pointer transition min-h-[46px] flex flex-wrap gap-1.5 items-center justify-between"
                  >
                    {newGameAllowedSubTeams.length === 0 ? (
                      <span className="text-slate-500 text-xs font-bold font-sansArabic flex items-center gap-1.5">
                        🟢 All Sub-Teams Allowed
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 flex-1 max-w-[calc(100%-110px)]">
                        {newGameAllowedSubTeams.map((teamId) => {
                          const t = teams[teamId];
                          if (!t) return null;
                          const isNehemiah = t.parentId === "Awlad_Na7mya";
                          return (
                            <span 
                              key={teamId}
                              className={cn(
                                "inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full text-white shadow-sm font-sansArabic border cursor-pointer",
                                isNehemiah 
                                  ? "bg-indigo-600 border-indigo-700" 
                                  : "bg-amber-600 border-amber-700"
                              )}
                              onClick={(e) => {
                                e.stopPropagation(); // prevent opening dropdown
                                setNewGameAllowedSubTeams(prev => prev.filter(id => id !== teamId));
                              }}
                              title="Tap to remove"
                            >
                              <span>{t.emojis}</span>
                              <span>{t.nameAr}</span>
                              <span className="ml-1 bg-white/20 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] hover:bg-white/40">×</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    
                    <span className="text-xs text-slate-400 font-bold shrink-0 ml-auto pl-2">
                      {isTeamDropdownOpen ? '▲ Close' : '▼ Select Teams'}
                    </span>
                  </div>

                  {/* Dropdown Overlay Option List */}
                  {isTeamDropdownOpen && (
                    <div className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 mt-1 space-y-4 max-h-[360px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                      
                      {/* Dropdown top controls: search & shortcut selectors */}
                      <div className="flex flex-col gap-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={teamFilterSearch}
                          onChange={(e) => setTeamFilterSearch(e.target.value)}
                          placeholder="🔍 Search specific sub-team name..."
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs focus:outline-none focus:border-slate-400 font-medium text-slate-700"
                        />
                        
                        {adminUserType !== "team" && (
                          <div className="flex flex-wrap gap-2 justify-between">
                            <div className="flex gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  const nehemiahIds = Object.values(teams)
                                    .filter(t => t.parentId === "Awlad_Na7mya")
                                    .map(t => t.id);
                                  setNewGameAllowedSubTeams(prev => {
                                    const filtered = prev.filter(id => {
                                      const t = teams[id];
                                      return t && t.parentId !== "Awlad_Na7mya";
                                    });
                                    return [...filtered, ...nehemiahIds];
                                  });
                                }}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-indigo-200/55 cursor-pointer transition"
                              >
                                🏗️ Add All {teams.Awlad_Na7mya?.nameAr || "أولاد نحميا"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const noahIds = Object.values(teams)
                                    .filter(t => t.parentId === "Noo7_&Shorakah")
                                    .map(t => t.id);
                                  setNewGameAllowedSubTeams(prev => {
                                    const filtered = prev.filter(id => {
                                      const t = teams[id];
                                      return t && t.parentId !== "Noo7_&Shorakah";
                                    });
                                    return [...filtered, ...noahIds];
                                  });
                                }}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-amber-200/55 cursor-pointer transition"
                              >
                                🚢 Add All {teams["Noo7_&Shorakah"]?.nameAr || "نوح وشركاؤه"}
                              </button>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setNewGameAllowedSubTeams([])}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-250 cursor-pointer transition"
                            >
                              Clear All
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Grouped lists of sub-teams */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1" onClick={(e) => e.stopPropagation()}>
                        {/* Nehemiah Sector Group */}
                        {(() => {
                          const nehemiahFiltered = Object.values(teams)
                            .filter(
                              (t) =>
                                (t.parentId === "Awlad_Na7mya") &&
                                (!teamFilterSearch.trim() || t.nameAr.toLowerCase().includes(teamFilterSearch.toLowerCase())) &&
                                (adminUserType !== "team" || !loggedInTeamId || t.id === loggedInTeamId)
                            );
                          if (nehemiahFiltered.length === 0) return null;
                          return (
                            <div className="space-y-2">
                              <div className="text-[11px] font-black text-indigo-700 pb-1 border-b border-indigo-100 flex items-center justify-between font-sansArabic">
                                <span>🏗️ {teams.Awlad_Na7mya?.nameAr || "أولاد نحميا للمقاولات"}</span>
                              </div>
                              <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                                {nehemiahFiltered.map((t) => {
                                  const isChecked = newGameAllowedSubTeams.includes(t.id);
                                  return (
                                    <div
                                      key={t.id}
                                      onClick={() => {
                                        if (isChecked) {
                                          setNewGameAllowedSubTeams(prev => prev.filter(id => id !== t.id));
                                        } else {
                                          setNewGameAllowedSubTeams(prev => [...prev, t.id]);
                                        }
                                      }}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none text-[11px] font-black h-10 border",
                                        isChecked 
                                          ? "bg-indigo-50/70 border-indigo-200 text-indigo-900" 
                                          : "bg-slate-50/50 border-slate-100 text-slate-750 hover:bg-slate-100/50"
                                      )}
                                    >
                                      <span className="font-sansArabic shrink-0 max-w-[140px] truncate">{t.emojis} {t.nameAr}</span>
                                      <div className={cn(
                                        "w-4.5 h-4.5 rounded-full flex items-center justify-center border font-bold text-[9px] shrink-0",
                                        isChecked ? "bg-indigo-600 border-indigo-700 text-white" : "border-slate-300 bg-white"
                                      )}>
                                        {isChecked ? "✓" : ""}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Noah Sector Group */}
                        {(() => {
                          const noahFiltered = Object.values(teams)
                            .filter(
                              (t) =>
                                (t.parentId === "Noo7_&Shorakah") &&
                                (!teamFilterSearch.trim() || t.nameAr.toLowerCase().includes(teamFilterSearch.toLowerCase())) &&
                                (adminUserType !== "team" || !loggedInTeamId || t.id === loggedInTeamId)
                            );
                          if (noahFiltered.length === 0) return null;
                          return (
                            <div className="space-y-2">
                              <div className="text-[11px] font-black text-amber-700 pb-1 border-b border-amber-100 flex items-center justify-between font-sansArabic">
                                <span>🚢 {teams["Noo7_&Shorakah"]?.nameAr || "نوح وشركاؤه للملاحة"}</span>
                              </div>
                              <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                                {noahFiltered.map((t) => {
                                  const isChecked = newGameAllowedSubTeams.includes(t.id);
                                  return (
                                    <div
                                      key={t.id}
                                      onClick={() => {
                                        if (isChecked) {
                                          setNewGameAllowedSubTeams(prev => prev.filter(id => id !== t.id));
                                        } else {
                                          setNewGameAllowedSubTeams(prev => [...prev, t.id]);
                                        }
                                      }}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none text-[11px] font-black h-10 border",
                                        isChecked 
                                          ? "bg-amber-50/70 border-amber-200 text-amber-900" 
                                          : "bg-slate-50/50 border-slate-100 text-slate-750 hover:bg-slate-100/50"
                                      )}
                                    >
                                      <span className="font-sansArabic shrink-0 max-w-[140px] truncate">{t.emojis} {t.nameAr}</span>
                                      <div className={cn(
                                        "w-4.5 h-4.5 rounded-full flex items-center justify-center border font-bold text-[9px] shrink-0",
                                        isChecked ? "bg-amber-600 border-amber-700 text-white" : "border-slate-300 bg-white"
                                      )}>
                                        {isChecked ? "✓" : ""}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Dropdown Action Footer */}
                      <div className="flex justify-between items-center border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] font-bold text-slate-400">
                          {newGameAllowedSubTeams.length} teams allowed to play
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsTeamDropdownOpen(false);
                          }}
                          className="bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
                        >
                          ✓ Done Choosing
                        </button>
                      </div>

                    </div>
                  )}
                </div>

                <div className="text-right font-semibold">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-[#0F172A] text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-800 transition whitespace-nowrap cursor-pointer text-xs animate-pulse hover:animate-none"
                  >
                    Add Main Game
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* tab CONTENT: scoring */}
        {activeTab === "scoring" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Days Management & Selection */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Select Day to Score
                  </label>
                  <p className="text-xs text-slate-500">Pick a day to award points to teams directly, without separate games setup.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDaySettings(!showDaySettings)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border shadow-sm",
                    showDaySettings 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <Calendar size={13} />
                  <span>{showDaySettings ? "Hide Day Setup" : "Manage Days ⚙️"}</span>
                </button>
              </div>

              {/* Day Selection Pills */}
              <div className="flex flex-wrap gap-2">
                {Object.values(days).map((day) => {
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        setDraftScores({});
                        setSelectedDayId(day.id);
                      }}
                      className={cn(
                        "px-4 py-2.5 rounded-xl border text-xs font-extrabold transition flex items-center gap-2 cursor-pointer",
                        selectedDayId === day.id
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      <Calendar size={13} />
                      <span>{day.name}</span>
                    </button>
                  );
                })}
                {Object.values(days).length === 0 && (
                  <p className="text-xs font-bold text-slate-400 italic py-1">No tournament days created yet.</p>
                )}
              </div>

              {/* Show Days Setup Management directly inline if active */}
              {showDaySettings && (
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-4 duration-200">
                  <h3 className="text-sm font-bold text-slate-800">Days Management</h3>
                  
                  {/* Day Creation Form */}
                  <form
                    onSubmit={handleCreateDay}
                    className="flex flex-col sm:flex-row gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200 border-dashed"
                  >
                    <div className="w-full sm:flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        Day Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={newDayName}
                        onChange={(e) => setNewDayName(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. Day 1, Day 2"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={newDayDate}
                        onChange={(e) => setNewDayDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-400"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition h-[36px] cursor-pointer flex items-center gap-1.5 justify-center"
                    >
                      <Plus size={14} /> Add Day
                    </button>
                  </form>

                  {/* Day Listing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {Object.values(days).map((day) => (
                      <div
                        key={day.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3 w-full mr-2">
                          <Calendar size={14} className="text-slate-400" />
                          <div className="flex-1 min-w-0">
                            {editingDayId === day.id ? (
                              <div className="flex items-center gap-1.5 w-full">
                                <input
                                  type="text"
                                  value={editDayName}
                                  onChange={(e) => setEditDayName(e.target.value)}
                                  className="bg-white border border-amber-400 p-1 px-2 rounded-lg text-xs font-bold text-slate-850 focus:outline-none flex-1 min-w-0"
                                  autoFocus
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditDay(day.id)}
                                  className="p-1 px-2 rounded bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition flex items-center gap-0.5 cursor-pointer shrink-0"
                                >
                                  <Check size={11} /> Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingDayId(null)}
                                  className="p-1 px-2 rounded bg-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-300 transition cursor-pointer shrink-0"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-xs truncate">
                                  {day.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {day.date}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {editingDayId !== day.id && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDayId(day.id);
                                setEditDayName(day.name);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                              title="Rename Day"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                triggerConfirm(
                                  "Delete Day",
                                  `Are you sure you want to delete day "${day.name}"? This removes any scores recorded for this day!`,
                                  () => deleteDay(day.id),
                                );
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                              title="Delete Day"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* List Game Accordions for Selected Day */}
            {(() => {
              const activeDay = days[selectedDayId];
              if (!activeDay) {
                return (
                  <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 border-dashed text-slate-400 shadow-sm font-sans">
                    <Calendar className="mx-auto mb-3 text-indigo-400 animate-bounce" size={36} />
                    <p className="font-extrabold text-sm text-slate-700">Please Select a Day First</p>
                    <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto font-sansArabic font-medium">
                      Select one of the days from the pills above to see or input scores.
                      <br />
                      اختر يوماً من الأزرار في الأعلى لعرض أو إدخال النقاط.
                    </p>
                  </div>
                );
              }

              // Get scorable teams: either sub-teams (has parentId) or autonomous teams (no children and no parent)
              const scorableTeams = Object.values(teams).filter(team => {
                const hasChildren = Object.values(teams).some(t => t.parentId === team.id);
                return team.parentId || !hasChildren;
              });

              // Group scorable teams by their parent name
              const parentList = Object.values(teams).filter(t => !t.parentId && Object.values(teams).some(child => child.parentId === t.id));
              
              // Find any independent teams (no parent and no children)
              const independentTeams = scorableTeams.filter(t => !t.parentId && !parentList.some(p => p.id === t.id));

              // Check if any draft changes are dirty
              const isAnyDraftDirty = Object.keys(draftScores).length > 0;

              return (
                <div className="space-y-6">
                  <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Trophy size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-black tracking-tight font-sansArabic flex items-center gap-2">
                          إدخال درجات فرق: <span className="text-amber-400">{activeDay.name}</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Award raw scores directly to each sub-team for today.</p>
                      </div>
                    </div>

                    {isAnyDraftDirty && (
                      <div className="flex gap-2 w-full sm:w-auto animate-in zoom-in-95 duration-200">
                        <button
                          type="button"
                          onClick={() => setDraftScores({})}
                          className="flex-1 sm:flex-initial bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                        >
                          Cancel Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerConfirm(
                              "Save All Scores",
                              `Are you sure you want to apply and save all modified team scores for ${activeDay.name}?`,
                              () => {
                                Object.entries(draftScores).forEach(([teamId, val]) => {
                                  updateScore(teamId, selectedDayId, val);
                                });
                                setDraftScores({});
                              }
                            );
                          }}
                          className="flex-1 sm:flex-initial bg-amber-400 hover:bg-amber-500 text-xs text-slate-[950] font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 justify-center cursor-pointer shadow-md"
                        >
                          <Check size={14} /> Save All Scores
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Loop parent organizations */}
                  <div className="space-y-6">
                    {parentList.map(parent => {
                      const parentChildren = scorableTeams
                        .filter(t => t.parentId === parent.id)
                        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
                      if (parentChildren.length === 0) return null;

                      return (
                        <div key={parent.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                            <span className="text-2xl select-none">{parent.emojis}</span>
                            <div>
                              <h3 className="font-extrabold text-[#0D1829] font-sansArabic text-base leading-none">
                                {parent.nameAr}
                              </h3>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Parent Group • {parent.nameAr}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {parentChildren.map(team => {
                              const savedScore = team.scores[selectedDayId] ?? "";
                              const draftValue = draftScores[team.id] !== undefined ? draftScores[team.id] : savedScore;
                              const isDirty = draftScores[team.id] !== undefined && draftScores[team.id] !== savedScore;

                              return (
                                <div key={team.id} className={cn(
                                  "p-4 rounded-2xl border transition flex items-center justify-between gap-4 bg-slate-50/50",
                                  isDirty ? "border-amber-300 bg-amber-50/15" : "border-slate-100"
                                )}>
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xl shrink-0 select-none">{team.emojis}</span>
                                    <div className="min-w-0">
                                      <p className="font-extrabold text-slate-800 text-sm font-sansArabic truncate bg-rose-50/0">
                                        {team.nameAr}
                                      </p>
                                      <p className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase tracking-wide">
                                        Saved: <span className="font-bold text-slate-600">{savedScore !== "" ? `${savedScore} pts` : "None"}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <input
                                      type="number"
                                      value={draftValue}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const cleanVal = e.target.value === "" ? "" : Number(e.target.value);
                                        setDraftScores(prev => ({
                                          ...prev,
                                          [team.id]: cleanVal
                                        }));
                                      }}
                                      className="bg-white border border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100 p-2 text-center rounded-xl text-sm font-semibold w-20 font-mono"
                                    />
                                    {isDirty && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          triggerConfirm(
                                            "Save Team Score",
                                            `Are you sure you want to save points for "${team.nameAr}" as ${draftValue || 0} PTS?`,
                                            () => {
                                              updateScore(team.id, selectedDayId, draftValue);
                                              setDraftScores(prev => {
                                                const copy = { ...prev };
                                                delete copy[team.id];
                                                return copy;
                                              });
                                            }
                                          );
                                        }}
                                        className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer flex items-center justify-center shrink-0"
                                        title="Save single score"
                                      >
                                        <Check size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Loop Independent teams if any exist */}
                    {independentTeams.length > 0 && (
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 font-sans">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                          <span className="text-xl">⭐</span>
                          <h3 className="font-extrabold text-[#0D1829] font-sansArabic text-base leading-none">
                            مجموعات مستقلة
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {independentTeams.map(team => {
                            const savedScore = team.scores[selectedDayId] ?? "";
                            const draftValue = draftScores[team.id] !== undefined ? draftScores[team.id] : savedScore;
                            const isDirty = draftScores[team.id] !== undefined && draftScores[team.id] !== savedScore;

                            return (
                              <div key={team.id} className={cn(
                                "p-4 rounded-xl border transition flex items-center justify-between gap-4 bg-slate-50/50",
                                isDirty ? "border-amber-300 bg-amber-50/15" : "border-slate-100"
                              )}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xl shrink-0 select-none">{team.emojis}</span>
                                  <div className="min-w-0">
                                    <p className="font-extrabold text-slate-800 text-sm font-sansArabic truncate">
                                      {team.nameAr}
                                    </p>
                                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                      Saved Weight: <span className="font-bold text-slate-600">{savedScore !== "" ? savedScore : 0}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <input
                                    type="number"
                                    value={draftValue}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const cleanVal = e.target.value === "" ? "" : Number(e.target.value);
                                      setDraftScores(prev => ({
                                        ...prev,
                                        [team.id]: cleanVal
                                      }));
                                    }}
                                    className="bg-white border border-slate-200 focus:border-indigo-400 p-2 text-center rounded-xl text-sm font-semibold w-20 font-mono"
                                  />
                                  {isDirty && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        triggerConfirm(
                                          "Save Team Score",
                                          `Are you sure you want to save points for "${team.nameAr}" as ${draftValue || 0} PTS?`,
                                          () => {
                                            updateScore(team.id, selectedDayId, draftValue);
                                            setDraftScores(prev => {
                                              const copy = { ...prev };
                                              delete copy[team.id];
                                              return copy;
                                            });
                                          }
                                        );
                                      }}
                                      className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer flex items-center justify-center shrink-0"
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );

              // Bypassed legacy games accordion below
              const filteredGames = games.filter((g) => {
                const isUnassigned = !g.dayId || !days[g.dayId];
                if (selectedDayId === "unassigned") {
                  return isUnassigned && g.isTeamScoring !== false;
                }
                return g.dayId === selectedDayId && g.isTeamScoring !== false;
              });

              if (filteredGames.length === 0) {
                return (
                  <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 border-dashed text-slate-400">
                    <Calendar
                      className="mx-auto mb-3 text-slate-300"
                      size={36}
                    />
                    <p className="font-bold text-sm">
                      No games added for this day yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Please add games or switch day in the Setup tab
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filteredGames.map((game) => {
                    const isExpanded = !!expandedGames[game.id];
                    const hasSubGames = game.subGames.length > 0;

                    // Header Scores Summary
                    const summaries = Object.values(teams)
                      .filter((t) => !t.parentId)
                      .map((t) => {
                        let teamScore = 0;
                        if (hasSubGames) {
                          game.subGames.forEach((sg) => {
                            const childTeams = Object.values(teams).filter(
                              (child) => {
                                const isChildOfThisParent = child.parentId === t.id;
                                const isAllowed = !game.allowedSubTeamIds || game.allowedSubTeamIds.length === 0 || game.allowedSubTeamIds.includes(child.id);
                                return isChildOfThisParent && isAllowed;
                              }
                            );
                            childTeams.forEach((child) => {
                              teamScore += Number(child.scores[sg.id]) || 0;
                            });
                          });
                        } else {
                          const childTeams = Object.values(teams).filter(
                            (child) => {
                              const isChildOfThisParent = child.parentId === t.id;
                              const isAllowed = !game.allowedSubTeamIds || game.allowedSubTeamIds.length === 0 || game.allowedSubTeamIds.includes(child.id);
                              return isChildOfThisParent && isAllowed;
                            }
                          );
                          childTeams.forEach((child) => {
                            teamScore += Number(child.scores[game.id]) || 0;
                          });
                        }
                        return {
                          emojis: t.emojis,
                          name: t.nameAr,
                          score: teamScore,
                          color: t.color,
                        };
                      });

                    return (
                      <div
                        key={game.id}
                        className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-300"
                      >
                        {/* Accordion Trigger */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedGames((prev) => ({
                              ...prev,
                              [game.id]: !prev[game.id],
                            }))
                          }
                          className="w-full text-left p-5 bg-slate-50/40 hover:bg-slate-50/90 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 transition duration-150 cursor-pointer"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                                {game.name}
                              </h3>
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                  hasSubGames
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "bg-sky-50 text-sky-700",
                                )}
                              >
                                {hasSubGames
                                  ? `${game.subGames.length} Sub-games`
                                  : "Standard"}
                              </span>
                              {game.isTeamScoring !== false && (
                                <span className="text-[9px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                                  🏗️ Affects Building
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider mt-1">
                              Max score limit: {game.maxPoints}
                            </p>
                          </div>

                          {/* Preview Scores & Caret */}
                          <div className="flex items-center gap-3.5 self-end md:self-auto">
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-650 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-inner">
                              {summaries.map((s, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1"
                                >
                                  <span>{s.emojis}</span>
                                  <span
                                    style={{ color: s.color }}
                                    className="font-mono"
                                  >
                                    {s.score}
                                  </span>
                                  {idx < summaries.length - 1 && (
                                    <span className="text-slate-200">|</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="text-slate-450">
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Accordion scoring panel */}
                        {isExpanded && (
                          <div className="p-6 bg-white space-y-10 border-t border-slate-50">
                            {[
                              "Awlad_Na7mya",
                              "Noo7_&Shorakah",
                            ]
                              .filter(
                                (id) =>
                                  teams[id] &&
                                  Object.values(teams).some(
                                    (t) => t.parentId === id,
                                  ),
                              )
                              .map((parentId) => {
                                const parentCompany = teams[parentId];
                                if (!parentCompany) return null;
                                let childTeams = Object.values(teams).filter(
                                  (t) => {
                                    const isChildOfThisParent = t.parentId === parentId;
                                    const isAllowed = !game.allowedSubTeamIds || game.allowedSubTeamIds.length === 0 || game.allowedSubTeamIds.includes(t.id);
                                    return isChildOfThisParent && isAllowed;
                                  },
                                );
                                if (adminUserType === "team" && loggedInTeamId) {
                                  childTeams = childTeams.filter((t) => t.id === loggedInTeamId);
                                }
                                if (childTeams.length === 0) return null;

                                return (
                                  <div key={parentId} className="space-y-4">
                                    {/* Parent Group Header */}
                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                      <span className="text-xl">
                                        {parentCompany.emojis}
                                      </span>
                                      <span className="font-extrabold text-slate-900 text-sm font-sansArabic">
                                        {parentCompany.nameAr}
                                      </span>
                                      <span className="text-xs text-slate-400 font-bold font-mono">
                                        ({childTeams.length} subgroups)
                                      </span>
                                    </div>

                                    {/* Subgroups Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {childTeams.map((team) => {
                                        const isOwnTeam =
                                          loggedInTeamId === team.id;
                                        const isEditable =
                                          adminUserType === "super" ||
                                          isOwnTeam;

                                        return (
                                          <div
                                            key={team.id}
                                            className={cn(
                                              "p-5 rounded-xl flex flex-col justify-between space-y-4 transition-all duration-200 relative",
                                              isOwnTeam &&
                                                adminUserType === "team"
                                                ? "bg-emerald-50/20 border-emerald-450 border-2 shadow-xs"
                                                : "bg-slate-50/60 border border-slate-200/60",
                                              !isEditable && "opacity-75",
                                            )}
                                          >
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xl">
                                                  {team.emojis}
                                                </span>
                                                <span className="font-bold text-slate-800 font-sansArabic text-sm">
                                                  {team.nameAr}
                                                </span>
                                              </div>
                                              {isOwnTeam &&
                                                adminUserType === "team" && (
                                                  <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
                                                    Your Team
                                                  </span>
                                                )}
                                            </div>

                                            {!hasSubGames ? (
                                              // Single Game Input Slider with Safe Draft Apply confirmation
                                              <div className="space-y-4">
                                                {(() => {
                                                  const draftKey = `team-${team.id}-${game.id}`;
                                                  const savedVal =
                                                    team.scores[game.id] !==
                                                    undefined
                                                      ? team.scores[game.id]
                                                      : "";
                                                  const currentVal =
                                                    draftKey in draftScores
                                                      ? draftScores[draftKey]
                                                      : savedVal;
                                                  const isDirty =
                                                    currentVal !== savedVal;

                                                  return (
                                                    <>
                                                      <div className="flex justify-between items-center">
                                                        <span className="text-xs font-semibold text-slate-400">
                                                          Points Score
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                          <AnimatedScoreInput
                                                            disabled={
                                                              !isEditable
                                                            }
                                                            value={currentVal}
                                                            max={game.maxPoints}
                                                            onChange={(val) =>
                                                              setDraftScores(
                                                                (prev) => ({
                                                                  ...prev,
                                                                  [draftKey]:
                                                                    val,
                                                                }),
                                                              )
                                                            }
                                                            className={cn(
                                                              "w-14",
                                                              isDirty &&
                                                                "border-amber-400 bg-amber-50",
                                                            )}
                                                            activeColor="sky"
                                                          />
                                                          <span className="text-xs text-slate-400">
                                                            / {game.maxPoints}
                                                          </span>

                                                          {isDirty && (
                                                            <div className="flex gap-1 animate-in zoom-in-95 duration-100">
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  triggerConfirm(
                                                                    "Confirm Score Update",
                                                                    `Are you sure you want to save the score for team "${team.nameAr}" in "${game.name}" as ${currentVal} points?`,
                                                                    () => {
                                                                      updateScore(
                                                                        team.id,
                                                                        game.id,
                                                                        currentVal,
                                                                      );
                                                                      setDraftScores(
                                                                        (
                                                                          prev,
                                                                        ) => {
                                                                          const copy =
                                                                            {
                                                                              ...prev,
                                                                            };
                                                                          delete copy[
                                                                            draftKey
                                                                          ];
                                                                          return copy;
                                                                        },
                                                                      );
                                                                    },
                                                                  );
                                                                }}
                                                                className="p-1 px-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition cursor-pointer font-bold text-[10px] flex items-center gap-0.5"
                                                              >
                                                                <Check
                                                                  size={11}
                                                                />{" "}
                                                                Save
                                                              </button>
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  setDraftScores(
                                                                    (prev) => {
                                                                      const copy =
                                                                        {
                                                                          ...prev,
                                                                        };
                                                                      delete copy[
                                                                        draftKey
                                                                      ];
                                                                      return copy;
                                                                    },
                                                                  );
                                                                }}
                                                                className="p-1 bg-slate-200 text-slate-655 rounded-lg hover:bg-slate-300 transition cursor-pointer"
                                                                title="Discard"
                                                              >
                                                                <Undo
                                                                  size={11}
                                                                />
                                                              </button>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>

                                                      <input
                                                        type="range"
                                                        min="0"
                                                        max={game.maxPoints}
                                                        value={currentVal || 0}
                                                        disabled={!isEditable}
                                                        onChange={(e) => {
                                                          setDraftScores(
                                                            (prev) => ({
                                                              ...prev,
                                                              [draftKey]:
                                                                parseInt(
                                                                  e.target
                                                                    .value,
                                                                  10,
                                                                ),
                                                            }),
                                                          );
                                                        }}
                                                        className={cn(
                                                          "w-full h-1.5 rounded-lg appearance-none",
                                                          isEditable
                                                            ? "cursor-pointer"
                                                            : "cursor-not-allowed opacity-50",
                                                        )}
                                                        style={{
                                                          background: `linear-gradient(to right, ${team.color} ${((Number(currentVal) || 0) / game.maxPoints) * 100}%, #cbd5e1 ${((Number(currentVal) || 0) / game.maxPoints) * 100}%)`,
                                                        }}
                                                      />
                                                    </>
                                                  );
                                                })()}
                                              </div>
                                            ) : (
                                              // Nested Subgames
                                              <div className="space-y-3.5">
                                                {game.subGames.map((subg) => {
                                                  const subDraftKey = `team-${team.id}-${subg.id}`;
                                                  const savedSubVal =
                                                    team.scores[subg.id] !==
                                                    undefined
                                                      ? team.scores[subg.id]
                                                      : "";
                                                  const currentSubVal =
                                                    subDraftKey in draftScores
                                                      ? draftScores[subDraftKey]
                                                      : savedSubVal;
                                                  const subDirty =
                                                    currentSubVal !==
                                                    savedSubVal;

                                                  return (
                                                    <div
                                                      key={subg.id}
                                                      className="bg-white p-3 rounded-lg border border-slate-100 flex flex-col gap-2 shadow-inner"
                                                    >
                                                      <div className="flex justify-between items-center">
                                                        <span className="text-xs font-semibold text-slate-705">
                                                          {subg.name}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                          <AnimatedScoreInput
                                                            disabled={
                                                              !isEditable
                                                            }
                                                            value={
                                                              currentSubVal
                                                            }
                                                            max={subg.maxPoints}
                                                            onChange={(val) =>
                                                              setDraftScores(
                                                                (prev) => ({
                                                                  ...prev,
                                                                  [subDraftKey]:
                                                                    val,
                                                                }),
                                                              )
                                                            }
                                                            className={cn(
                                                              "w-12",
                                                              subDirty &&
                                                                "border-amber-300 bg-amber-50",
                                                            )}
                                                            activeColor="sky"
                                                          />
                                                          <span className="text-[10px] text-slate-400">
                                                            / {subg.maxPoints}
                                                          </span>

                                                          {subDirty && (
                                                            <div className="flex gap-1 animate-in zoom-in-95">
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  triggerConfirm(
                                                                    "Confirm Sub-Challenge Score",
                                                                    `Are you sure you want to save the score of team "${team.nameAr}" in "${subg.name}" as ${currentSubVal} points?`,
                                                                    () => {
                                                                      updateScore(
                                                                        team.id,
                                                                        subg.id,
                                                                        currentSubVal,
                                                                      );
                                                                      setDraftScores(
                                                                        (
                                                                          prev,
                                                                        ) => {
                                                                          const copy =
                                                                            {
                                                                              ...prev,
                                                                            };
                                                                          delete copy[
                                                                            subDraftKey
                                                                          ];
                                                                          return copy;
                                                                        },
                                                                      );
                                                                    },
                                                                  );
                                                                }}
                                                                className="p-1 px-1.5 text-[9px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition cursor-pointer"
                                                              >
                                                                Save
                                                              </button>
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  setDraftScores(
                                                                    (prev) => {
                                                                      const copy =
                                                                        {
                                                                          ...prev,
                                                                        };
                                                                      delete copy[
                                                                        subDraftKey
                                                                      ];
                                                                      return copy;
                                                                    },
                                                                  );
                                                                }}
                                                                className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded transition"
                                                              >
                                                                <Undo
                                                                  size={10}
                                                                />
                                                              </button>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>

                                                      <input
                                                        type="range"
                                                        min="0"
                                                        max={subg.maxPoints}
                                                        value={
                                                          currentSubVal || 0
                                                        }
                                                        disabled={!isEditable}
                                                        onChange={(e) => {
                                                          setDraftScores(
                                                            (prev) => ({
                                                              ...prev,
                                                              [subDraftKey]:
                                                                parseInt(
                                                                  e.target
                                                                    .value,
                                                                  15,
                                                                ),
                                                            }),
                                                          );
                                                        }}
                                                        className={cn(
                                                          "w-full h-1 rounded-lg appearance-none",
                                                          isEditable
                                                            ? "cursor-pointer"
                                                            : "cursor-not-allowed opacity-50",
                                                        )}
                                                        style={{
                                                          background: `linear-gradient(to right, ${team.color} ${((Number(currentSubVal) || 0) / subg.maxPoints) * 100}%, #cbd5e1 ${((Number(currentSubVal) || 0) / subg.maxPoints) * 100}%)`,
                                                        }}
                                                      />
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Total progress bars display */}
            <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm mt-8">
              <h2 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-3">
                Cumulative Overviews
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.values(teams)
                  .filter((t) => !t.parentId)
                  .map((team) => {
                    const teamTotal = calculateTeamScore(team, games);
                    const progress = calculateTeamProgress(
                      team,
                      games,
                      eventTargetScore,
                    );

                    return (
                      <div key={team.id} className="relative">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-800 font-sansArabic flex items-center gap-1.5">
                            <span>{team.emojis}</span> {team.nameAr}
                          </span>
                          <span
                            className="font-bold text-sm tracking-tight"
                            style={{ color: team.color }}
                          >
                            {teamTotal} pts
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-4 p-0.5 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: team.color,
                            }}
                          />
                        </div>
                        <div className="text-right text-[9px] font-extrabold text-slate-400 mt-1 tracking-widest">
                          {Math.round(progress)}% COMPLETION
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* tab CONTENT: activities */}
        {activeTab === "activities" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Horizontal Day Selection Tabs for Activities (Only needed for Daily activities context) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Active Scoring Day
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Some activities require scoring per-day. Choose the active
                    day to enter scores for it.
                  </p>
                </div>
                {selectedDayId === "unassigned" && (
                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-md font-bold animate-pulse">
                    ⚠️ Select a valid day below for daily items
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.values(days).map((day) => {
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        setDraftScores({});
                        setSelectedDayId(day.id);
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer",
                        selectedDayId === day.id
                          ? "bg-slate-900 border-slate-900 text-white shadow"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      <Calendar size={13} />
                      <span>{day.name}</span>
                    </button>
                  );
                })}

                {/* Unassigned Day Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setDraftScores({});
                    setSelectedDayId("unassigned");
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer",
                    selectedDayId === "unassigned"
                      ? "bg-amber-100 border-amber-300 text-amber-900 shadow font-black"
                      : "bg-amber-55/45 border-amber-200/50 text-amber-800 hover:bg-amber-50",
                  )}
                >
                  <span className="text-sm">❔</span>
                  <span>Unassigned Day</span>
                </button>
              </div>
            </div>

            {/* Add New Activity Form */}
            {adminUserType === "super" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="text-lg">✨</span>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Create New Activity
                  </h3>
                </div>
                <form
                  onSubmit={handleAddActivity}
                  className="flex flex-col gap-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Activity Name */}
                    <div className="col-span-1 md:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                        Activity Name
                      </label>
                      <input
                        type="text"
                        value={newActivityName}
                        onChange={(e) => setNewActivityName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-sm font-semibold transition"
                        placeholder="e.g., Attendance, Cheering, Slogan"
                        required
                      />
                    </div>

                    {/* Max Points */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                        Max Points
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter points"
                        value={newActivityMaxPoints}
                        onChange={(e) => setNewActivityMaxPoints(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-sm font-semibold transition text-slate-800"
                      />
                    </div>

                    {/* Icon Selection */}
                    <div className="col-span-1 md:col-span-3 col-start-auto">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                        Icon / Emoji (Optional)
                      </label>
                      {newIconSelectMode === "preset" ? (
                        <select
                          value={newActivityIcon}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setNewIconSelectMode("custom");
                              setNewActivityIcon("");
                            } else {
                              setNewActivityIcon(e.target.value);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-250 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-xs font-semibold transition text-slate-800"
                        >
                          <option value="🏆">🏆 Trophy (Default)</option>
                          <option value="👥">👥 Team / Group</option>
                          <option value="📣">📣 Cheering / Tashge3</option>
                          <option value="🤝">🤝 Teamwork</option>
                          <option value="🎨">🎨 Creativity</option>
                          <option value="🎵">🎵 Hymns / Melodies</option>
                          <option value="🎯">🎯 Focus / Target</option>
                          <option value="⚽">⚽ Games / Sports</option>
                          <option value="⛪">⛪ Church</option>
                          <option value="📖">📖 Bible Readings</option>
                          <option value="🕯️">🕯️ Prayers / Metanoias</option>
                          <option value="🌟">🌟 Star / Excellence</option>
                          <option value="💡">💡 Idea / Quiz</option>
                          <option value="__custom__">
                            ✍️ Custom / Other (Manual Input)
                          </option>
                        </select>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={10}
                            value={newActivityIcon}
                            onChange={(e) => setNewActivityIcon(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-250 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-sm font-bold transition text-slate-800"
                            placeholder="e.g. ⭐, 🎨"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setNewIconSelectMode("preset");
                              setNewActivityIcon("🏆");
                            }}
                            className="px-3 bg-slate-200 hover:bg-slate-350 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
                          >
                            Presets
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Rule Selector */}
                    <div className="col-span-1 md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                        Rule Type
                      </label>
                      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() => setNewActivityIsDaily(true)}
                          className={cn(
                            "flex-1 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer text-center",
                            newActivityIsDaily
                              ? "bg-slate-900 text-white shadow"
                              : "text-slate-655 hover:text-slate-900",
                          )}
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewActivityIsDaily(false)}
                          className={cn(
                            "flex-1 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer text-center",
                            !newActivityIsDaily
                              ? "bg-slate-900 text-white shadow"
                              : "text-slate-655 hover:text-slate-900",
                          )}
                        >
                          One-Time
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-right pt-2 border-t border-slate-100">
                    <button
                      type="submit"
                      className="w-full sm:w-auto bg-[#0F172A] text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition whitespace-nowrap cursor-pointer text-xs uppercase tracking-wider shadow"
                    >
                      Add Activity
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Other Scoring Activities list */}
            <div className="bg-white text-slate-900 rounded-[24px] p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                      Other Scoring Activities
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage complementary daily points or global one-time tasks
                    that directly build each team's 3D Land.
                  </p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100/60 text-xs font-mono font-bold flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Sync Active</span>
                </div>
              </div>

              {/* Define dynamic render item locally to avoid duplicated logic */}
              {(() => {
                const formatDateHuman = (dateString: string) => {
                  if (!dateString) return "Recorded";
                  if (dateString.includes("-")) {
                    const d = new Date(dateString);
                    if (!isNaN(d.getTime())) {
                      return d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }
                  }
                  return dateString;
                };

                // Helper to search and format scoring history
                const getScoredDaysInfo = (activityKey: string) => {
                  const scoredDaysList: {
                    dayId: string;
                    dayName: string;
                    dateText: string;
                  }[] = [];

                  Object.values(days).forEach((day) => {
                    const activityScoreId = `activity_${activityKey}_${day.id}`;
                    // Check if any team has scored points > 0
                    const hasScores = Object.values(teams).some((t) => {
                      if (adminUserType === "team" && loggedInTeamId && t.id !== loggedInTeamId) {
                        return false;
                      }
                      const val = t.scores[activityScoreId];
                      return typeof val === "number" && val > 0;
                    });

                    if (hasScores) {
                      const savedDate =
                        activityScoringDates[activityScoreId] ||
                        day.date ||
                        "Recorded";
                      scoredDaysList.push({
                        dayId: day.id,
                        dayName: day.name,
                        dateText: savedDate,
                      });
                    }
                  });

                  return scoredDaysList;
                };

                const renderActivityItem = (
                  key: string,
                  act: (typeof activities)[string],
                ) => {
                  const isExpanded = !!expandedActivities[key];

                  // Score key generation based on configuration
                  // If isDaily is true: score maps dynamically to activity_${key}_${selectedDayId}
                  // If isDaily is false: global day-agnostic key activity_${key}_onetime
                  const daySuffix = act.isDaily
                    ? selectedDayId === "unassigned"
                      ? "unassigned"
                      : selectedDayId
                    : "onetime";
                  const activityScoreId = `activity_${key}_${daySuffix}`;

                  // Determine active day name
                  const currentDayName =
                    selectedDayId === "unassigned"
                      ? "Unassigned Day"
                      : days[selectedDayId]?.name || "Unknown Day";

                  // Counts how many teams have a score > 0 for this scope
                  let parentTeamsList = ["Awlad_Na7mya", "Noo7_&Shorakah"].map(id => teams[id]).filter(Boolean);
                  if (adminUserType === "team" && loggedInTeamId) {
                    const userTeam = teams[loggedInTeamId];
                    const userParentId = userTeam?.parentId || loggedInTeamId;
                    parentTeamsList = parentTeamsList.filter((t) => t.id === userParentId);
                  }
                  const completedCount = parentTeamsList.filter(
                    (t) => (t.scores[activityScoreId] || 0) > 0,
                  ).length;
                  const allTeamsCount = parentTeamsList.length;

                  return (
                    <div
                      key={key}
                      className={cn(
                        "rounded-[24px] border transition-all duration-350 overflow-hidden flex flex-col justify-between bg-white w-full shadow-xs",
                        isExpanded
                          ? "border-slate-300 shadow-md scale-[1.002]"
                          : "border-slate-200 hover:border-slate-300 hover:shadow-xs",
                      )}
                    >
                      {/* Main card header row matching Screenshot 2 */}
                      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shrink-0 border border-slate-200/50 select-none">
                            {act.icon || "🏆"}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-base tracking-tight">
                              {act.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500 font-bold">
                                Max Limit: {act.maxPoints} pts
                              </span>
                              <span className="text-slate-300 text-xs select-none">
                                •
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider",
                                  act.isDaily
                                    ? "bg-sky-50 text-sky-700 border border-sky-100/80"
                                    : "bg-amber-50 text-amber-700 border border-amber-100/80",
                                )}
                              >
                                {act.isDaily ? "DAILY" : "ONE-TIME"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions aligned on the right in Screenshot 2 */}
                        <div className="flex items-center gap-2.5 self-end sm:self-auto">
                          {adminUserType === "super" && (
                            <>
                              {/* Edit Info (Yellow/Amber button) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingActivity({
                                    key,
                                    name: act.name,
                                    icon: act.icon,
                                    maxPoints: String(act.maxPoints),
                                    isDaily: act.isDaily,
                                  });
                                  setEditIconSelectMode(
                                    [
                                      "🏆",
                                      "👥",
                                      "📣",
                                      "🤝",
                                      "🎨",
                                      "🎵",
                                      "🎯",
                                      "⚽",
                                      "⛪",
                                      "📖",
                                      "🕯️",
                                      "🌟",
                                      "💡",
                                    ].includes(act.icon)
                                      ? "preset"
                                      : "custom",
                                  );
                                }}
                                className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-400/30"
                                title="Edit info of this activity"
                              >
                                <Pencil size={13} />
                                <span>Edit info</span>
                              </button>

                              {/* Delete (Rose light button) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteActivity(key);
                                }}
                                className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-650 px-4.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                title="Delete Activity"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </>
                          )}

                          {/* Chevron expand arrow */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedActivities((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                              }))
                            }
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition border cursor-pointer",
                              isExpanded
                                ? "bg-slate-900 border-slate-900 text-white shadow"
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100",
                            )}
                            title={
                              isExpanded ? "Collapse Scoring" : "Expand Scoring"
                            }
                          >
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded scoring grid zone matching Screenshot 3 */}
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-1 bg-white space-y-5 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                          {/* Top warning or guide message matching Screenshot 3 */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 px-4 py-3.5 rounded-2xl border border-slate-150 text-xs">
                            <span className="text-slate-600 font-medium">
                              {act.isDaily ? (
                                <>
                                  👉 This is a{" "}
                                  <strong className="text-sky-700">
                                    Daily Activity
                                  </strong>
                                  . You are currently awarding scores for{" "}
                                  <strong className="text-slate-900 bg-slate-200/50 px-2 py-0.5 rounded-md font-mono">
                                    {currentDayName}
                                  </strong>
                                  . Use the day chooser above to score different
                                  days.
                                </>
                              ) : (
                                <>
                                  👉 This is a{" "}
                                  <strong className="text-amber-700">
                                    One-Time Activity
                                  </strong>
                                  . Scores recorded here are day-agnostic and
                                  persist across the entire countdown event.
                                </>
                              )}
                            </span>
                            {act.isDaily && selectedDayId === "unassigned" && (
                              <span className="text-rose-600 font-extrabold animate-pulse">
                                ⚠️ Please select a valid Day above to award
                                score safely!
                              </span>
                            )}
                          </div>

                          {/* Multi-team input grid showing only parent teams */}
                          <div className="space-y-10">
                            {(() => {
                              const parentIdsToShow = ["Awlad_Na7mya", "Noo7_&Shorakah"].filter(id => {
                                const parentCompany = teams[id];
                                if (!parentCompany) return false;
                                if (adminUserType === "team" && loggedInTeamId) {
                                  const userTeam = teams[loggedInTeamId];
                                  return userTeam?.parentId === id || loggedInTeamId === id;
                                }
                                return true;
                              });

                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  {parentIdsToShow.map((teamId) => {
                                    const team = teams[teamId];
                                    if (!team) return null;

                                    const draftScKey = `act-draft-${team.id}-${activityScoreId}`;
                                    const savedActVal =
                                      team.scores[activityScoreId] !==
                                      undefined
                                        ? team.scores[activityScoreId]
                                        : "";
                                    const currentActVal =
                                      draftScKey in draftScores
                                        ? draftScores[draftScKey]
                                        : savedActVal;
                                    const isDirty =
                                      currentActVal !== savedActVal;

                                    // One-time stats check
                                    const hasPoints =
                                      typeof savedActVal === "number" &&
                                      savedActVal > 0;

                                    return (
                                      <div
                                        key={team.id}
                                        className={cn(
                                          "p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all duration-200 bg-[#FCFDFE]",
                                          hasPoints && !act.isDaily
                                            ? "border-emerald-200"
                                            : "border-slate-150 hover:border-slate-250",
                                        )}
                                      >
                                        {/* Team Arabic Title & Emoji */}
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-2xl select-none">
                                              {team.emojis}
                                            </span>
                                            <span className="font-extrabold text-base text-slate-800 font-sansArabic">
                                              {team.nameAr}
                                            </span>
                                          </div>
                                          {!act.isDaily && hasPoints && (
                                            <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full font-bold uppercase tracking-wider select-none font-sans">
                                              Completed
                                            </span>
                                          )}
                                        </div>

                                        {/* Point Inputs & Slider */}
                                        <div className="space-y-4">
                                          <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                                              Points
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="number"
                                                min="0"
                                                max={act.maxPoints}
                                                value={currentActVal}
                                                onChange={(e) => {
                                                  const val =
                                                    e.target.value === ""
                                                      ? ""
                                                      : Number(
                                                          e.target.value,
                                                        );
                                                  // Handle clipping limit typing
                                                  let numVal: number | "" =
                                                    val;
                                                  if (
                                                    typeof numVal ===
                                                    "number"
                                                  ) {
                                                    if (numVal < 0)
                                                      numVal = 0;
                                                    if (
                                                      numVal > act.maxPoints
                                                    )
                                                      numVal =
                                                        act.maxPoints;
                                                  }
                                                  setDraftScores(
                                                    (prev) => ({
                                                      ...prev,
                                                      [draftScKey]: numVal,
                                                    }),
                                                  );
                                                }}
                                                className={cn(
                                                  "w-16 text-center text-slate-900 font-black bg-white border rounded-xl py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono",
                                                  isDirty
                                                    ? "border-amber-400 bg-amber-50/70 ring-2 ring-amber-300"
                                                    : "border-slate-200",
                                                )}
                                              />
                                              <span className="text-slate-400 font-bold font-sans text-sm">
                                                / {act.maxPoints}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Team Points Progress Slider matching Screenshot 3 */}
                                          <div className="space-y-1">
                                            <input
                                              type="range"
                                              disabled={
                                                act.isDaily &&
                                                selectedDayId ===
                                                  "unassigned"
                                              }
                                              min="0"
                                              max={act.maxPoints}
                                              value={
                                                Number(currentActVal) || 0
                                              }
                                              onChange={(e) => {
                                                const val = parseInt(
                                                  e.target.value,
                                                  10,
                                                );
                                                setDraftScores((prev) => ({
                                                  ...prev,
                                                  [draftScKey]: val,
                                                }));
                                              }}
                                              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-100 accent-emerald-600"
                                              style={{
                                                background: `linear-gradient(to right, ${team.color || "#059669"} ${((Number(currentActVal) || 0) / act.maxPoints) * 100}%, #f1f5f9 ${((Number(currentActVal) || 0) / act.maxPoints) * 100}%)`,
                                              }}
                                            />
                                          </div>

                                          {/* Premium Autosave inline triggers - avoids popup friction */}
                                          {isDirty && (
                                            <div className="flex gap-2 pt-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const finalVal =
                                                    currentActVal === ""
                                                      ? 0
                                                      : Number(
                                                          currentActVal,
                                                        );

                                                  // Instant commit on state & real Supabase
                                                  updateScore(
                                                    team.id,
                                                    activityScoreId,
                                                    finalVal,
                                                  );

                                                  // Save scoring timestamp to register scoring date history nicely
                                                  const todayStr =
                                                    new Date().toLocaleDateString(
                                                      "en-US",
                                                      {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                      },
                                                    );
                                                  const updatedDates = {
                                                    ...activityScoringDates,
                                                    [activityScoreId]:
                                                      todayStr,
                                                  };
                                                  setActivityScoringDates(
                                                    updatedDates,
                                                  );
                                                  localStorage.setItem(
                                                    "activity_scoring_dates",
                                                    JSON.stringify(
                                                      updatedDates,
                                                    ),
                                                  );

                                                  setDraftScores((prev) => {
                                                    const copy = {
                                                      ...prev,
                                                    };
                                                    delete copy[draftScKey];
                                                    return copy;
                                                  });
                                                }}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-[11px] transition cursor-pointer flex items-center justify-center gap-1 shadow-xs font-sans"
                                              >
                                                💾 Save Score
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setDraftScores((prev) => {
                                                    const copy = {
                                                      ...prev,
                                                    };
                                                    delete copy[draftScKey];
                                                    return copy;
                                                  });
                                                }}
                                                className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition border border-slate-200 cursor-pointer flex items-center justify-center"
                                                title="Discard edits"
                                              >
                                                <Undo size={14} />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Info & Scoring Date timestamps row matching Screenshot 2 */}
                      <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-4 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                              {act.isDaily
                                ? "📅 Activity History"
                                : "⭐ Activity Record"}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-bold text-[11px] text-slate-400">
                              {act.isDaily
                                ? `Target: ${currentDayName}`
                                : "Target: Event Duration"}
                            </span>
                          </div>

                          <span className="font-mono text-xs bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-700 font-extrabold select-none">
                            {completedCount}/{allTeamsCount} Scored
                          </span>
                        </div>

                        {/* Rich Scored Days History dates display requested! */}
                        {act.isDaily ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(() => {
                              const scoredDays = getScoredDaysInfo(key);
                              if (scoredDays.length === 0) {
                                return (
                                  <span className="text-[11px] text-slate-400 italic font-medium col-span-2 py-1 bg-white border border-slate-150 rounded-xl px-4 text-center">
                                    No points have been recorded for any day
                                    yet. Enter values and click "Save Score" to
                                    list history.
                                  </span>
                                );
                              }

                              return scoredDays.map((sd) => {
                                const activityScoreIdForDay = `activity_${key}_${sd.dayId}`;
                                const teamScores = Object.values(teams)
                                  .filter((t) => !t.parentId)
                                  .filter((t) => {
                                    if (adminUserType === "team" && loggedInTeamId) {
                                      const userTeam = teams[loggedInTeamId];
                                      const userParentId = userTeam?.parentId || loggedInTeamId;
                                      return t.id === userParentId;
                                    }
                                    return true;
                                  })
                                  .map((t) => {
                                    const scoreVal =
                                      t.scores[activityScoreIdForDay];
                                    return {
                                      id: t.id,
                                      nameAr: t.nameAr,
                                      emojis: t.emojis,
                                      color: t.color,
                                      score:
                                        typeof scoreVal === "number"
                                          ? scoreVal
                                          : 0,
                                    };
                                  })
                                  .filter((t) => t.score > 0);

                                return (
                                  <div
                                    key={sd.dayId}
                                    className="bg-white border border-emerald-100/80 p-3.5 rounded-2xl shadow-xs flex flex-col gap-2.5 hover:border-emerald-200 transition"
                                  >
                                    <div className="flex items-center justify-between gap-2 border-b border-emerald-50/60 pb-1.5">
                                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1">
                                        <span>🎯</span>
                                        <span>{sd.dayName}</span>
                                      </span>
                                      <span className="text-[10px] bg-emerald-50 text-emerald-850 font-bold px-2 py-0.5 rounded-lg border border-emerald-100/50 font-mono">
                                        {formatDateHuman(sd.dateText)}
                                      </span>
                                    </div>

                                    {teamScores.length === 0 ? (
                                      <span className="text-[10px] text-slate-400 italic">
                                        No positive scores recorded
                                      </span>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {teamScores.map((ts) => {
                                          return (
                                            <div
                                              key={ts.nameAr}
                                              className="flex items-center justify-between text-[11px] font-semibold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 hover:border-red-100 hover:bg-rose-50/5 transition-colors min-h-[38px] transition-all"
                                            >
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-base shrink-0 select-none">
                                                  {ts.emojis}
                                                </span>
                                                <span className="font-sansArabic font-bold truncate max-w-[120px]">
                                                  {ts.nameAr}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 shrink-0">
                                                <div className="font-extrabold text-[#059669] font-sans">
                                                  +{ts.score}{" "}
                                                  <span className="text-[9px] text-slate-400 uppercase font-medium">
                                                    pts
                                                  </span>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    triggerConfirm(
                                                      "Are you sure?",
                                                      `Are you sure you want to delete these points for ${ts.nameAr}?`,
                                                      () => {
                                                        updateScore(ts.id, activityScoreIdForDay, 0);
                                                      },
                                                      "Yes",
                                                      "Cancel",
                                                      "px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-md cursor-pointer",
                                                      "px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-md cursor-pointer"
                                                    );
                                                  }}
                                                  className="text-slate-400 hover:text-red-500 hover:bg-slate-100 p-1 rounded transition cursor-pointer"
                                                  title="حذف النقاط"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                         ) : (
                           <div className="bg-white border border-slate-150 p-4 rounded-2xl">
                             {(() => {
                               const activityScoreIdForOnetime = `activity_${key}_onetime`;
                               const teamScores = Object.values(teams)
                                 .filter((t) => !t.parentId)
                                 .filter((t) => {
                                   if (adminUserType === "team" && loggedInTeamId) {
                                     const userTeam = teams[loggedInTeamId];
                                     const userParentId = userTeam?.parentId || loggedInTeamId;
                                     return t.id === userParentId;
                                   }
                                   return true;
                                 })
                                 .map((t) => {
                                   const scoreVal =
                                     t.scores[activityScoreIdForOnetime];
                                   return {
                                     id: t.id,
                                     nameAr: t.nameAr,
                                     emojis: t.emojis,
                                     color: t.color,
                                     score:
                                       typeof scoreVal === "number"
                                         ? scoreVal
                                         : 0,
                                   };
                                 })
                                 .filter((t) => t.score > 0);

                              const savedDate =
                                activityScoringDates[
                                  activityScoreIdForOnetime
                                ] || "Awarded";

                              if (teamScores.length === 0) {
                                return (
                                  <span className="text-[11px] text-slate-400 italic font-medium py-1 text-center block">
                                    No team points have been recorded for this
                                    challenge yet. Choose a score and save.
                                  </span>
                                );
                              }

                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2 border-b border-amber-50/60 pb-2">
                                    <span className="font-bold text-xs text-slate-800">
                                      Completed Challenge Scores
                                    </span>
                                    <span className="text-[10px] bg-amber-50 text-amber-850 font-bold px-2 py-0.5 rounded-lg border border-amber-100/50 font-mono">
                                      {formatDateHuman(savedDate)}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {teamScores.map((ts) => {
                                      return (
                                        <div
                                          key={ts.nameAr}
                                          className="flex items-center justify-between text-[11px] font-semibold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 min-h-[38px] transition-all"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-base shrink-0 select-none">
                                              {ts.emojis}
                                            </span>
                                            <span className="font-sansArabic font-bold truncate max-w-[150px]">
                                              {ts.nameAr}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <div className="font-extrabold text-amber-700 font-sans">
                                              +{ts.score}{" "}
                                              <span className="text-[9px] text-slate-400 uppercase font-medium">
                                                pts
                                              </span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                triggerConfirm(
                                                  "Are you sure?",
                                                  `Are you sure you want to delete these points for ${ts.nameAr}?`,
                                                  () => {
                                                    updateScore(ts.id, activityScoreIdForOnetime, 0);
                                                  },
                                                  "Yes",
                                                  "Cancel",
                                                  "px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-md cursor-pointer",
                                                  "px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-md cursor-pointer"
                                                );
                                              }}
                                              className="text-slate-400 hover:text-red-500 hover:bg-slate-100 p-1 rounded transition cursor-pointer"
                                              title="حذف النقاط"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                };

                const dailyActs = Object.entries(activities).filter(
                  ([_, act]) => act.isDaily,
                );
                const oneTimeActs = Object.entries(activities).filter(
                  ([_, act]) => !act.isDaily,
                );

                return (
                  <div className="space-y-8">
                    {/* Daily Activities Grid */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                        <span className="text-xl">📅</span>
                        <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-widest">
                          Daily Activities
                        </h3>
                      </div>
                      {dailyActs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 text-center">
                          No daily activities configured yet.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {dailyActs.map(([key, act]) =>
                            renderActivityItem(key, act),
                          )}
                        </div>
                      )}
                    </div>

                    {/* One-Time Activities Grid */}
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                        <span className="text-xl">⭐</span>
                        <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-widest">
                          One-Time Activities
                        </h3>
                      </div>
                      {oneTimeActs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 text-center">
                          No one-time activities configured yet.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {oneTimeActs.map(([key, act]) =>
                            renderActivityItem(key, act),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* tab CONTENT: mvp */}
        {activeTab === "mvp" && (
          <div className="space-y-8 animate-in fade-in-50 duration-200">
            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                Personal MVP Scoring
              </h2>
              <p className="text-slate-500 text-sm mb-6 font-medium">
                These scores are for individual players and do not affect the
                main 3D building progress.
              </p>

              <form
                onSubmit={handleAddPlayer}
                className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200"
              >
                <div className="w-full sm:flex-1">
                  <label className="block text-[11px] font-bold text-slate-505 mb-1.5 uppercase tracking-widest">
                    Player Name
                  </label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-slate-400 text-sm"
                    placeholder="e.g. Antony Mohab"
                    required
                  />
                </div>
                {adminUserType === "super" ? (
                  <>
                    <div className="w-full sm:w-64">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                        1. Select Division
                      </label>
                      <select
                        value={selectedParentMvp}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedParentMvp(val);
                          setNewPlayerTeam(""); // reset sub-team
                        }}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-slate-400 text-sm font-semibold text-slate-800"
                      >
                        <option value="">
                          -- No Division / Unassigned --
                        </option>
                        <option value="Awlad_Na7mya">🏗️ {teams.Awlad_Na7mya?.nameAr || "أولاد نحميا للمقاولات"}</option>
                        <option value="Noo7_&Shorakah">🚢 {teams["Noo7_&Shorakah"]?.nameAr || "نوح وشركاؤه للملاحة"}</option>
                      </select>
                    </div>

                    <div className="w-full sm:w-64">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                        2. Select Sub-Team
                      </label>
                      <select
                        value={newPlayerTeam}
                        onChange={(e) => setNewPlayerTeam(e.target.value)}
                        disabled={!selectedParentMvp}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-slate-400 text-sm font-semibold text-slate-800 disabled:bg-slate-150 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {!selectedParentMvp ? "-- Select Division First --" : "-- Select Sub-Team --"}
                        </option>
                        {selectedParentMvp &&
                          Object.values(teams)
                            .filter(
                              (t) =>
                                t.parentId === selectedParentMvp
                            )
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.emojis} {t.nameAr}
                              </option>
                            ))}
                      </select>
                    </div>
                  </>
                ) : (
                  loggedInTeamId &&
                  teams[loggedInTeamId] && (
                    <div className="w-full sm:w-64">
                      <label className="block text-[11px] font-bold text-slate-505 mb-1.5 uppercase tracking-widest">
                        Assign Team (Enforced)
                      </label>
                      <div className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded-lg text-sm font-extrabold text-slate-700 select-none flex items-center gap-1.5 h-[38px] sm:h-[44px]">
                        <span>{teams[loggedInTeamId].emojis}</span>{" "}
                        <span>{teams[loggedInTeamId].nameAr}</span>
                      </div>
                    </div>
                  )
                )}
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-[#0F172A] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-slate-800 transition whitespace-nowrap h-[44px] cursor-pointer text-xs flex items-center justify-center"
                >
                  Add Player
                </button>
              </form>
            </div>

            {Object.values(players).length > 0 && (
              <div className="space-y-12">
                {/* Dynamically Search and Filter by Player Names */}
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-250 flex items-center gap-3">
                  <Search className="text-slate-500 shrink-0" size={18} />
                  <input
                    type="text"
                    value={mvpSearchQuery}
                    onChange={(e) => setMvpSearchQuery(e.target.value)}
                    placeholder="🔍 Search name here to immediately find player and update their scores..."
                    className="w-full bg-transparent text-sm font-semibold focus:outline-none placeholder-slate-450 text-slate-800"
                  />
                  {mvpSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMvpSearchQuery("")}
                      className="text-xs font-bold bg-slate-250 hover:bg-slate-350 text-slate-600 px-3 py-1 rounded-lg cursor-pointer transition whitespace-nowrap"
                    >
                      Clear Search
                    </button>
                  )}
                </div>

                {filteredMvpPlayers.length === 0 && (
                  <div className="p-16 text-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50/50">
                    <p className="text-sm font-bold text-slate-700">
                      No players found matching "{mvpSearchQuery}"
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Check spelling or search another name.
                    </p>
                  </div>
                )}

                {Object.values(teams).map((team) => {
                  const teamPlayers = filteredMvpPlayers.filter(
                    (p) => p.teamId === team.id,
                  );
                  if (teamPlayers.length === 0) return null;

                  return (
                    <div key={team.id} className="space-y-4">
                      {/* Team Header/Divider */}
                      <div className="flex items-center gap-3 px-2 py-1 select-none">
                        <span className="text-2xl">{team.emojis}</span>
                        <h3 className="text-lg font-bold text-slate-800 font-sansArabic">
                          {team.nameAr}
                        </h3>
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200"
                          style={{
                            borderColor: `${team.color}30`,
                            backgroundColor: `${team.color}10`,
                            color: team.color,
                          }}
                        >
                          {teamPlayers.length}{" "}
                          {teamPlayers.length === 1 ? "Player" : "Players"}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                      </div>

                      <div className="grid gap-6">
                        {teamPlayers.map((player) => {
                          const totalScore = calculatePlayerScore(player);
                          const filteredMvpGames = games.filter(
                            (g) =>
                              g.isMvpScoring !== false &&
                              (!g.allowedSubTeamIds ||
                                g.allowedSubTeamIds.length === 0 ||
                                (player.teamId && g.allowedSubTeamIds.includes(player.teamId))),
                          );
                          const isEditablePlayer =
                            adminUserType === "super" ||
                            player.teamId === loggedInTeamId;

                          return (
                            <div
                              key={player.id}
                              className={cn(
                                "bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-8 items-start hover:shadow-md transition duration-200 animate-in fade-in duration-100",
                                !isEditablePlayer && "opacity-80",
                              )}
                            >
                              <div className="md:w-1/3 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-8 md:min-h-[160px] h-full justify-between w-full">
                                <div className="flex justify-between items-start mb-4 gap-4 w-full">
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    {/* Interactive clickable circular avatar with fallback initials */}
                                    <div
                                      onClick={() => {
                                        if (!isEditablePlayer) return;
                                        if (player.avatarUrl) {
                                          setAvatarActionPlayer({
                                            id: player.id,
                                            name: player.name,
                                            avatarUrl: player.avatarUrl,
                                          });
                                        } else {
                                          setCroppingPlayer({
                                            id: player.id,
                                            name: player.name,
                                          });
                                        }
                                      }}
                                      className={cn(
                                        "w-14 h-14 rounded-full border-2 overflow-hidden shadow-inner relative group transition flex items-center justify-center font-black text-sm text-slate-500 bg-slate-50 shrink-0 select-none",
                                        isEditablePlayer
                                          ? "hover:border-amber-400 cursor-pointer"
                                          : "cursor-default",
                                      )}
                                      style={{ borderColor: `${team.color}40` }}
                                      title={
                                        isEditablePlayer
                                          ? player.avatarUrl
                                            ? "Click to view or edit profile picture"
                                            : "Click to upload profile picture"
                                          : undefined
                                      }
                                    >
                                      {player.avatarUrl ? (
                                        <img
                                          src={player.avatarUrl}
                                          alt={player.name}
                                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <span
                                          className="opacity-95 font-extrabold uppercase"
                                          style={{ color: team.color }}
                                        >
                                          {player.name.trim().substring(0, 2)}
                                        </span>
                                      )}
                                      {isEditablePlayer && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200 text-white">
                                          <Camera
                                            size={14}
                                            className="stroke-[2.5]"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <div className="truncate">
                                      <h3
                                        className="text-xl font-bold text-slate-900 truncate leading-tight"
                                        title={player.name}
                                      >
                                        {player.name}
                                      </h3>
                                      <span
                                        className="inline-block mt-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border"
                                        style={{
                                          borderColor: `${team.color}40`,
                                          backgroundColor: `${team.color}15`,
                                          color: team.color,
                                        }}
                                      >
                                        {team.nameAr}
                                      </span>
                                    </div>
                                  </div>
                                  {isEditablePlayer && (
                                    <button
                                      onClick={() =>
                                        handleDeletePlayerClick(
                                          player.id,
                                          player.name,
                                        )
                                      }
                                      className="text-xs font-bold text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-xl cursor-pointer transition shrink-0 select-none"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                                <div className="mt-auto pt-4 flex items-baseline gap-2">
                                  <span className="text-3xl font-extrabold text-amber-500">
                                    {totalScore}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-405 uppercase tracking-widest">
                                    Total MVP Points
                                  </span>
                                </div>
                              </div>

                              <div className="md:w-2/3 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Bonus MVP Points card */}
                                {(() => {
                                  const bonusKey = `player-${player.id}-bonus`;
                                  const savedBonus = Math.max(
                                    0,
                                    player.scores["bonus"] || 0,
                                  );
                                  const currentBonus =
                                    bonusKey in draftScores
                                      ? draftScores[bonusKey]
                                      : savedBonus;
                                  const isDirty = currentBonus !== savedBonus;

                                  return (
                                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col justify-between min-h-[110px]">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                                          <Award size={14} /> Bonus MVP Points
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <AnimatedScoreInput
                                            disabled={!isEditablePlayer}
                                            value={currentBonus}
                                            max={100}
                                            onChange={(val) =>
                                              setDraftScores((prev) => ({
                                                ...prev,
                                                [bonusKey]: val,
                                              }))
                                            }
                                            className="w-12 border-amber-200 text-amber-900"
                                            activeColor="amber"
                                          />

                                          {isDirty && (
                                            <div className="flex gap-1 animate-in zoom-in-95 font-sans">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  triggerConfirm(
                                                    "Save Bonus Score",
                                                    `Are you sure you want to award ${currentBonus} bonus MVP points to player "${player.name}"?`,
                                                    () => {
                                                      updatePlayerScore(
                                                        player.id,
                                                        "bonus",
                                                        currentBonus,
                                                      );
                                                      setDraftScores((prev) => {
                                                        const copy = {
                                                          ...prev,
                                                        };
                                                        delete copy[bonusKey];
                                                        return copy;
                                                      });
                                                    },
                                                  );
                                                }}
                                                className="p-1 px-2 text-[9px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                                              >
                                                Save
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setDraftScores((prev) => {
                                                    const copy = { ...prev };
                                                    delete copy[bonusKey];
                                                    return copy;
                                                  });
                                                }}
                                                className="p-1 bg-white text-slate-500 rounded hover:bg-slate-100 transition"
                                              >
                                                <Undo size={10} />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={currentBonus}
                                        disabled={!isEditablePlayer}
                                        onChange={(e) =>
                                          setDraftScores((prev) => ({
                                            ...prev,
                                            [bonusKey]: parseInt(
                                              e.target.value,
                                              10,
                                            ),
                                          }))
                                        }
                                        className={cn(
                                          "w-full h-1 appearance-none bg-amber-200 mt-2 rounded-lg",
                                          isEditablePlayer
                                            ? "cursor-pointer"
                                            : "cursor-not-allowed opacity-50",
                                        )}
                                      />
                                    </div>
                                  );
                                })()}

                                {/* Regular game MVP inputs */}
                                {filteredMvpGames.length === 0 ? (
                                  <div className="bg-slate-50 p-4 rounded-xl text-center text-slate-400 text-xs italic border border-dashed border-slate-200 flex items-center justify-center min-h-[110px]">
                                    No games designated for MVP scoring.
                                  </div>
                                ) : (
                                  filteredMvpGames.map((g) => {
                                    const mvpGameKey = `player-${player.id}-${g.id}`;
                                    const savedMvpVal =
                                      player.scores[g.id] || 0;
                                    const currentMvpVal =
                                      mvpGameKey in draftScores
                                        ? draftScores[mvpGameKey]
                                        : savedMvpVal;
                                    const isDirty =
                                      currentMvpVal !== savedMvpVal;

                                    return (
                                      <div
                                        key={g.id}
                                        className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 flex flex-col justify-between min-h-[110px]"
                                      >
                                        <div className="flex justify-between items-center mb-1 font-sans">
                                          <span
                                            className="text-xs font-semibold text-slate-700 truncate mr-2 animate-in"
                                            title={g.name}
                                          >
                                            {g.name}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <AnimatedScoreInput
                                              disabled={!isEditablePlayer}
                                              value={currentMvpVal}
                                              max={g.maxPoints}
                                              onChange={(val) =>
                                                setDraftScores((prev) => ({
                                                  ...prev,
                                                  [mvpGameKey]: val,
                                                }))
                                              }
                                              className="w-12"
                                              activeColor="amber"
                                            />

                                            {isDirty && (
                                              <div className="flex gap-1 animate-in zoom-in-95">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    triggerConfirm(
                                                      "Save Player Challenge Score",
                                                      `Are you sure you want to record ${currentMvpVal} MVP points for player "${player.name}" in game "${g.name}"?`,
                                                      () => {
                                                        updatePlayerScore(
                                                          player.id,
                                                          g.id,
                                                          currentMvpVal,
                                                        );
                                                        setDraftScores(
                                                          (prev) => {
                                                            const copy = {
                                                              ...prev,
                                                            };
                                                            delete copy[
                                                              mvpGameKey
                                                            ];
                                                            return copy;
                                                          },
                                                        );
                                                      },
                                                    );
                                                  }}
                                                  className="p-1 px-2 text-[9px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setDraftScores((prev) => {
                                                      const copy = { ...prev };
                                                      delete copy[mvpGameKey];
                                                      return copy;
                                                    });
                                                  }}
                                                  className="p-1 bg-white text-slate-550 rounded hover:bg-slate-100 transition"
                                                >
                                                  <Undo size={10} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <input
                                          type="range"
                                          min="0"
                                          max={g.maxPoints}
                                          value={currentMvpVal}
                                          disabled={!isEditablePlayer}
                                          onChange={(e) =>
                                            setDraftScores((prev) => ({
                                              ...prev,
                                              [mvpGameKey]: parseInt(
                                                e.target.value,
                                                10,
                                              ),
                                            }))
                                          }
                                          className={cn(
                                            "w-full h-1 appearance-none bg-slate-200 mt-2 rounded-lg",
                                            isEditablePlayer
                                              ? "cursor-pointer"
                                              : "cursor-not-allowed opacity-50",
                                          )}
                                        />
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Unassigned/fallback group if any players with invalid or deleted teamIds exist */}
                {(() => {
                  const unassignedPlayers = filteredMvpPlayers.filter(
                    (p) => !p.teamId || !teams[p.teamId],
                  );
                  if (unassignedPlayers.length === 0) return null;

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 px-2 py-1 select-none">
                        <span className="text-2xl">👥</span>
                        <h3 className="text-lg font-bold text-slate-800">
                          Unassigned Players
                        </h3>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-600">
                          {unassignedPlayers.length}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                      </div>

                      <div className="grid gap-6">
                        {unassignedPlayers.map((player) => {
                          const totalScore = calculatePlayerScore(player);
                          const filteredMvpGames = games.filter(
                            (g) =>
                              g.isMvpScoring !== false &&
                              (!g.allowedSubTeamIds ||
                                g.allowedSubTeamIds.length === 0 ||
                                (player.teamId && g.allowedSubTeamIds.includes(player.teamId))),
                          );
                          const isEditablePlayer =
                            adminUserType === "super" ||
                            player.teamId === loggedInTeamId;

                          return (
                            <div
                              key={player.id}
                              className={cn(
                                "bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-8 items-start hover:shadow-md transition duration-200 animate-in fade-in duration-100",
                                !isEditablePlayer && "opacity-80",
                              )}
                            >
                              <div className="md:w-1/3 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-8 md:min-h-[160px] h-full justify-between">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h3 className="text-xl font-bold text-slate-900">
                                      {player.name}
                                    </h3>
                                    <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                      No Team
                                    </span>
                                  </div>
                                  {isEditablePlayer && (
                                    <button
                                      onClick={() =>
                                        handleDeletePlayerClick(
                                          player.id,
                                          player.name,
                                        )
                                      }
                                      className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded cursor-pointer transition"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                                <div className="mt-auto pt-4 flex items-baseline gap-2">
                                  <span className="text-3xl font-extrabold text-amber-500">
                                    {totalScore}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-405 uppercase tracking-widest">
                                    Total MVP Points
                                  </span>
                                </div>
                              </div>

                              <div className="md:w-2/3 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Bonus MVP Points card */}
                                {(() => {
                                  const bonusKey = `player-${player.id}-bonus`;
                                  const savedBonus =
                                    player.scores["bonus"] || 0;
                                  const currentBonus =
                                    bonusKey in draftScores
                                      ? draftScores[bonusKey]
                                      : savedBonus;
                                  const isDirty = currentBonus !== savedBonus;

                                  return (
                                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col justify-between min-h-[110px]">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                                          <Award size={14} /> Bonus MVP Points
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <AnimatedScoreInput
                                            value={currentBonus}
                                            max={100}
                                            onChange={(val) =>
                                              setDraftScores((prev) => ({
                                                ...prev,
                                                [bonusKey]: val,
                                              }))
                                            }
                                            className="w-12 border-amber-200 text-amber-900"
                                            activeColor="amber"
                                          />

                                          {isDirty && (
                                            <div className="flex gap-1 animate-in zoom-in-95 font-sans">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  triggerConfirm(
                                                    "Save Bonus Score",
                                                    `Are you sure you want to award ${currentBonus} bonus MVP points to player "${player.name}"?`,
                                                    () => {
                                                      updatePlayerScore(
                                                        player.id,
                                                        "bonus",
                                                        currentBonus,
                                                      );
                                                      setDraftScores((prev) => {
                                                        const copy = {
                                                          ...prev,
                                                        };
                                                        delete copy[bonusKey];
                                                        return copy;
                                                      });
                                                    },
                                                  );
                                                }}
                                                className="p-1 px-2 text-[9px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                                              >
                                                Save
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setDraftScores((prev) => {
                                                    const copy = { ...prev };
                                                    delete copy[bonusKey];
                                                    return copy;
                                                  });
                                                }}
                                                className="p-1 bg-white text-slate-500 rounded hover:bg-slate-100 transition"
                                              >
                                                <Undo size={10} />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={currentBonus}
                                        onChange={(e) =>
                                          setDraftScores((prev) => ({
                                            ...prev,
                                            [bonusKey]: parseInt(
                                              e.target.value,
                                              10,
                                            ),
                                          }))
                                        }
                                        className="w-full h-1 appearance-none cursor-pointer bg-amber-200 mt-2 rounded-lg"
                                      />
                                    </div>
                                  );
                                })()}

                                {/* Regular game MVP inputs */}
                                {filteredMvpGames.length === 0 ? (
                                  <div className="bg-slate-50 p-4 rounded-xl text-center text-slate-400 text-xs italic border border-dashed border-slate-200 flex items-center justify-center min-h-[110px]">
                                    No games designated for MVP scoring.
                                  </div>
                                ) : (
                                  filteredMvpGames.map((g) => {
                                    const mvpGameKey = `player-${player.id}-${g.id}`;
                                    const savedMvpVal =
                                      player.scores[g.id] || 0;
                                    const currentMvpVal =
                                      mvpGameKey in draftScores
                                        ? draftScores[mvpGameKey]
                                        : savedMvpVal;
                                    const isDirty =
                                      currentMvpVal !== savedMvpVal;

                                    return (
                                      <div
                                        key={g.id}
                                        className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 flex flex-col justify-between min-h-[110px]"
                                      >
                                        <div className="flex justify-between items-center mb-1 font-sans">
                                          <span
                                            className="text-xs font-semibold text-slate-700 truncate mr-2 animate-in"
                                            title={g.name}
                                          >
                                            {g.name}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <AnimatedScoreInput
                                              value={currentMvpVal}
                                              max={g.maxPoints}
                                              onChange={(val) =>
                                                setDraftScores((prev) => ({
                                                  ...prev,
                                                  [mvpGameKey]: val,
                                                }))
                                              }
                                              className="w-12"
                                              activeColor="amber"
                                            />

                                            {isDirty && (
                                              <div className="flex gap-1 animate-in zoom-in-95">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    triggerConfirm(
                                                      "Save Player Challenge Score",
                                                      `Are you sure you want to record ${currentMvpVal} MVP points for player "${player.name}" in game "${g.name}"?`,
                                                      () => {
                                                        updatePlayerScore(
                                                          player.id,
                                                          g.id,
                                                          currentMvpVal,
                                                        );
                                                        setDraftScores(
                                                          (prev) => {
                                                            const copy = {
                                                              ...prev,
                                                            };
                                                            delete copy[
                                                              mvpGameKey
                                                            ];
                                                            return copy;
                                                          },
                                                        );
                                                      },
                                                    );
                                                  }}
                                                  className="p-1 px-2 text-[9px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setDraftScores((prev) => {
                                                      const copy = { ...prev };
                                                      delete copy[mvpGameKey];
                                                      return copy;
                                                    });
                                                  }}
                                                  className="p-1 bg-white text-slate-550 rounded hover:bg-slate-100 transition"
                                                >
                                                  <Undo size={10} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <input
                                          type="range"
                                          min="0"
                                          max={g.maxPoints}
                                          value={currentMvpVal}
                                          onChange={(e) =>
                                            setDraftScores((prev) => ({
                                              ...prev,
                                              [mvpGameKey]: parseInt(
                                                e.target.value,
                                                10,
                                              ),
                                            }))
                                          }
                                          className="w-full h-1 appearance-none cursor-pointer bg-slate-200 mt-2 rounded-lg"
                                        />
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* tab CONTENT: standings leaderboard */}
        {activeTab === "leaderboard" && (
          <MvpLeaderboard 
            darkMode={false} 
            loggedInTeamId={loggedInTeamId}
            adminUserType={adminUserType}
          />
        )}

        {/* tab CONTENT: settings */}
        {activeTab === "settings" && (
          <SettingsPanel
            teams={teams}
            adminUserType={adminUserType}
            loggedInTeamId={loggedInTeamId}
            setTeamCode={setTeamCode}
            deleteTeam={deleteTeam}
            addTeam={addTeam}
          />
        )}

        {/* tab CONTENT: badges */}
        {activeTab === "badges" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏅</span>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-sansArabic">
                  أوسمة المجموعات والشركات / Milestone Badges Management
                </h2>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl font-sans">
                Manually award or retract milestone badges for Parent Groups (Companies) and individual sub-teams. Checked badges show up immediately inside the kids' "Scores & Badges" portal page and within their 3D sandbox environments.
              </p>
            </div>

            <div className="space-y-6">
              {(() => {
                const parentList = Object.values(teams).filter(t => !t.parentId && Object.values(teams).some(child => child.parentId === t.id));
                const MILESTONES_CONFIG = [
                  { percent: 25, title: 'Bronze 25%', emoji: '🥉', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200/60', checkedColor: 'bg-amber-100 text-amber-900 border-amber-400 font-extrabold shadow-sm' },
                  { percent: 50, title: 'Silver 50%', emoji: '🥈', color: 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/60', checkedColor: 'bg-slate-200 text-slate-900 border-slate-400 font-extrabold shadow-sm' },
                  { percent: 75, title: 'Gold 75%', emoji: '🥇', color: 'bg-yellow-50 text-yellow-850 hover:bg-yellow-101 border-yellow-200/60', checkedColor: 'bg-yellow-100 text-yellow-901 border-yellow-400 font-extrabold shadow-sm' },
                  { percent: 100, title: 'Crown 100%', emoji: '👑', color: 'bg-indigo-50 text-indigo-701 hover:bg-indigo-101 border-indigo-200/60', checkedColor: 'bg-indigo-100 text-indigo-901 border-indigo-400 font-extrabold shadow-sm' },
                ];

                return parentList.map(parent => {
                  return (
                    <div key={parent.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      {/* Parent Group Info */}
                      <div className="flex items-center gap-3">
                        <span className="text-3xl select-none" role="img">{parent.emojis}</span>
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-lg font-sansArabic">{parent.nameAr}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Main Parent Group / الشركة الأم</p>
                        </div>
                      </div>

                      {/* Badges for Parent group */}
                      <div className="flex flex-wrap gap-2.5">
                        {MILESTONES_CONFIG.map(m => {
                          const isChecked = parent.scores?.[`badge_${m.percent}`] === 1;
                          return (
                            <button
                              key={m.percent}
                              type="button"
                              onClick={() => {
                                updateScore(parent.id, `badge_${m.percent}`, isChecked ? "" : 1);
                              }}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs border cursor-pointer transition duration-150 select-none",
                                isChecked ? m.checkedColor : m.color
                              )}
                            >
                              <span>{m.emoji}</span>
                              <span>{m.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmProps.isOpen}
        title={confirmProps.title}
        message={confirmProps.message}
        onConfirm={confirmProps.onConfirm}
        onCancel={() => setConfirmProps((p) => ({ ...p, isOpen: false }))}
        confirmLabel={confirmProps.confirmLabel}
        cancelLabel={confirmProps.cancelLabel}
        confirmBtnClassName={confirmProps.confirmBtnClassName}
        cancelBtnClassName={confirmProps.cancelBtnClassName}
      />

      {croppingPlayer && (
        <ImageCropperModal
          playerName={croppingPlayer.name}
          playerId={croppingPlayer.id}
          onClose={() => setCroppingPlayer(null)}
          onSaveAvatar={(url) => {
            updatePlayerAvatar(croppingPlayer.id, url);
          }}
          darkMode={false}
        />
      )}

      {/* Avatar Action Choice Dialog */}
      {avatarActionPlayer && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                📸 Profile Photo Options
              </h3>
              <button
                type="button"
                onClick={() => setAvatarActionPlayer(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-red-500 transition"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-slate-600 font-semibold text-sm mb-6 text-center leading-relaxed">
              What would you like to do for{" "}
              <strong className="text-slate-900 font-black">
                {avatarActionPlayer.name}
              </strong>
              ?
            </p>

            <div className="flex flex-col gap-3 font-sans font-bold text-xs">
              <button
                type="button"
                onClick={() => {
                  setViewingAvatarUrl({
                    name: avatarActionPlayer.name,
                    url: avatarActionPlayer.avatarUrl,
                  });
                  setAvatarActionPlayer(null);
                }}
                className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Eye size={15} />
                View Profile Picture
              </button>

              <button
                type="button"
                onClick={() => {
                  setCroppingPlayer({
                    id: avatarActionPlayer.id,
                    name: avatarActionPlayer.name,
                  });
                  setAvatarActionPlayer(null);
                }}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Upload size={15} />
                Upload New Photo
              </button>

              <button
                type="button"
                onClick={() => setAvatarActionPlayer(null)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition text-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Avatar Circular Screen Lightbox */}
      {viewingAvatarUrl && (
        <div
          onClick={() => setViewingAvatarUrl(null)}
          className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm cursor-zoom-out select-none animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl overflow-hidden bg-transparent flex flex-col items-center animate-in zoom-in-95 duration-200"
          >
            <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-full overflow-hidden border-4 border-amber-400 shadow-2xl bg-slate-900 flex items-center justify-center">
              <img
                src={viewingAvatarUrl.url}
                alt={viewingAvatarUrl.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="mt-5 text-center px-4">
              <h4 className="text-white text-lg font-black tracking-tight font-sans">
                {viewingAvatarUrl.name}
              </h4>
              <p className="text-slate-405 text-xs mt-1.5 font-semibold">
                Profile Photo
              </p>
            </div>

            <button
              type="button"
              onClick={() => setViewingAvatarUrl(null)}
              className="mt-6 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-full border border-white/10 transition cursor-pointer font-sans"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}

      {/* Activity Edit Dialog/Modal */}
      {editingActivity && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-600 flex items-center gap-1.5 font-sans">
                ✏️ Edit Activity
              </h3>
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-red-500 transition"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveActivityEdit} className="space-y-4">
              {/* Activity Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                  Activity Name
                </label>
                <input
                  type="text"
                  value={editingActivity.name}
                  onChange={(e) =>
                    setEditingActivity((prev) =>
                      prev ? { ...prev, name: e.target.value } : null,
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-250 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-sm font-semibold transition text-slate-800"
                  required
                />
              </div>

              {/* Max Points */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                  Max Points Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingActivity.maxPoints}
                  onChange={(e) =>
                    setEditingActivity((prev) =>
                      prev ? { ...prev, maxPoints: e.target.value } : null,
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-250 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-sm font-mono font-bold transition text-slate-800"
                  required
                />
              </div>

              {/* Icon / Emoji */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                  Icon / Emoji (Optional)
                </label>
                {editIconSelectMode === "preset" ? (
                  <select
                    value={
                      [
                        "🏆",
                        "👥",
                        "📣",
                        "🤝",
                        "🎨",
                        "🎵",
                        "🎯",
                        "⚽",
                        "⛪",
                        "📖",
                        "🕯️",
                        "🌟",
                        "💡",
                      ].includes(editingActivity.icon)
                        ? editingActivity.icon
                        : "__custom__"
                    }
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setEditIconSelectMode("custom");
                        setEditingActivity((prev) =>
                          prev ? { ...prev, icon: "" } : null,
                        );
                      } else {
                        setEditingActivity((prev) =>
                          prev ? { ...prev, icon: e.target.value } : null,
                        );
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-250 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-xs font-semibold transition text-slate-800"
                  >
                    <option value="🏆">🏆 Trophy (Default)</option>
                    <option value="👥">👥 Team / Group</option>
                    <option value="📣">📣 Cheering / Tashge3</option>
                    <option value="🤝">🤝 Teamwork</option>
                    <option value="🎨">🎨 Creativity</option>
                    <option value="🎵">🎵 Hymns / Melodies</option>
                    <option value="🎯">🎯 Focus / Target</option>
                    <option value="⚽">⚽ Games / Sports</option>
                    <option value="⛪">⛪ Church</option>
                    <option value="📖">📖 Bible Readings</option>
                    <option value="🕯️">🕯️ Prayers / Metanoias</option>
                    <option value="🌟">🌟 Star / Excellence</option>
                    <option value="💡">💡 Idea / Quiz</option>
                    <option value="__custom__">
                      ✍️ Custom / Other (Manual Input)
                    </option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={10}
                      value={editingActivity.icon}
                      onChange={(e) =>
                        setEditingActivity((prev) =>
                          prev ? { ...prev, icon: e.target.value } : null,
                        )
                      }
                      className="flex-1 bg-slate-50 border border-slate-250 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-sm font-bold transition text-slate-800"
                      placeholder="e.g. ⭐, 🎨"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditIconSelectMode("preset");
                        setEditingActivity((prev) =>
                          prev ? { ...prev, icon: "🏆" } : null,
                        );
                      }}
                      className="px-3 bg-slate-200 hover:bg-slate-350 text-slate-700 hover:text-slate-950 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
                    >
                      Presets
                    </button>
                  </div>
                )}
              </div>

              {/* Rule Type Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                  Rule Type
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingActivity((prev) =>
                        prev ? { ...prev, isDaily: true } : null,
                      )
                    }
                    className={cn(
                      "flex-1 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer text-center",
                      editingActivity.isDaily
                        ? "bg-slate-900 text-white shadow"
                        : "text-slate-650 hover:text-slate-900",
                    )}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingActivity((prev) =>
                        prev ? { ...prev, isDaily: false } : null,
                      )
                    }
                    className={cn(
                      "flex-1 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer text-center",
                      !editingActivity.isDaily
                        ? "bg-slate-900 text-white shadow"
                        : "text-slate-650 hover:text-slate-900",
                    )}
                  >
                    One-Time
                  </button>
                </div>
              </div>

              {/* Call to action buttons */}
              <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-slate-800 text-white transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
