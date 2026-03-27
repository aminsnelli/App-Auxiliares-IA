const STORAGE_KEY = "codex_words_app_v2";
const LEGACY_STORAGE_KEY = "codex_words_app_v1";
const DEFAULT_TIMER_SECONDS = 20;
const DEFAULT_ROUND_SIZE = 10;

const state = {
  groups: [],
  selectedGroupId: null,
  editingWordId: null,
  selectedAudioBlob: null,
  selectedAudioUrl: null,
  mediaRecorder: null,
  recorderChunks: [],
  selectedStudyGroupIds: [],
  studyDeck: [],
  currentCard: null,
  currentResult: null,
  timerRemaining: null,
  timerIntervalId: null,
  studyStats: createEmptyStudyStats(),
  settings: {
    accuracyWindowSize: 20,
    dailyRoundGoal: 4,
  },
  activityByDate: {},
};

const elements = {
  tabs: [...document.querySelectorAll(".nav-tab")],
  views: {
    cadastro: document.getElementById("cadastro-view"),
    estudo: document.getElementById("estudo-view"),
    dashboard: document.getElementById("dashboard-view"),
  },
  groupList: document.getElementById("group-list"),
  groupCount: document.getElementById("group-count"),
  wordList: document.getElementById("word-list"),
  wordCount: document.getElementById("word-count"),
  editorTitle: document.getElementById("editor-title"),
  editorSubtitle: document.getElementById("editor-subtitle"),
  wordForm: document.getElementById("word-form"),
  ptInput: document.getElementById("pt-input"),
  enInput: document.getElementById("en-input"),
  phoneticInput: document.getElementById("phonetic-input"),
  recordBtn: document.getElementById("record-btn"),
  stopBtn: document.getElementById("stop-btn"),
  playRecordingBtn: document.getElementById("play-recording-btn"),
  clearRecordingBtn: document.getElementById("clear-recording-btn"),
  recordingStatus: document.getElementById("recording-status"),
  saveWordBtn: document.getElementById("save-word-btn"),
  cancelEditBtn: document.getElementById("cancel-edit-btn"),
  newGroupBtn: document.getElementById("new-group-btn"),
  groupDialog: document.getElementById("group-dialog"),
  studySettingsDialog: document.getElementById("study-settings-dialog"),
  openStudySettingsBtn: document.getElementById("open-study-settings-btn"),
  groupNameInput: document.getElementById("group-name-input"),
  groupDescriptionInput: document.getElementById("group-description-input"),
  saveGroupBtn: document.getElementById("save-group-btn"),
  studyModeInputs: [...document.querySelectorAll('input[name="study-mode"]')],
  manualSelectionBox: document.getElementById("manual-selection-box"),
  studyGroupList: document.getElementById("study-group-list"),
  promptDirection: document.getElementById("prompt-direction"),
  timerInput: document.getElementById("timer-input"),
  roundSizeInput: document.getElementById("round-size-input"),
  maxAttemptsInput: document.getElementById("max-attempts-input"),
  startStudyBtn: document.getElementById("start-study-btn"),
  studySummary: document.getElementById("study-summary"),
  studyCard: document.getElementById("study-card"),
  timerDisplay: document.getElementById("timer-display"),
  scoreDisplay: document.getElementById("score-display"),
  sidebarStreakDisplay: document.getElementById("sidebar-streak-display"),
  sidebarRoundsDisplay: document.getElementById("sidebar-rounds-display"),
  sidebarRoundsCard: document.getElementById("sidebar-rounds-card"),
  sidebarGoalStatus: document.getElementById("sidebar-goal-status"),
  studyTopFeedback: document.getElementById("study-top-feedback"),
  studyTopResult: document.getElementById("study-top-result"),
  audioAnswerBtn: document.getElementById("audio-answer-btn"),
  nextCardBtn: document.getElementById("next-card-btn"),
  accuracyWindowInput: document.getElementById("accuracy-window-input"),
  dailyRoundGoalInput: document.getElementById("daily-round-goal-input"),
  resetAllStatsBtn: document.getElementById("reset-all-stats-btn"),
  dashboardSummary: document.getElementById("dashboard-summary"),
  dashboardWordList: document.getElementById("dashboard-word-list"),
  dashboardCount: document.getElementById("dashboard-count"),
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nowIso() {
  return new Date().toISOString();
}

function createDefaultStats(stats = {}) {
  const history = Array.isArray(stats.history)
    ? stats.history.map((item) => ({
      correct: Boolean(item.correct),
      answeredAt: item.answeredAt || null,
      confidence: item.confidence || "high",
      slow: Boolean(item.slow),
      timedOut: Boolean(item.timedOut),
    }))
    : createLegacyHistory(stats.attempts, stats.correct);
  const historyCorrect = history.filter((item) => item.correct).length;

  return {
    attempts: Math.max(Number(stats.attempts || 0), history.length),
    correct: Math.max(Number(stats.correct || 0), historyCorrect),
    shows: Number(stats.shows || 0),
    autoShows: Number(stats.autoShows || 0),
    manualShows: Number(stats.manualShows || 0),
    lastSeenAt: stats.lastSeenAt || null,
    lastAnsweredAt: stats.lastAnsweredAt || null,
    history,
    masteryStartIndex: Number.isFinite(Number(stats.masteryStartIndex))
      ? Number(stats.masteryStartIndex)
      : null,
  };
}

function createLegacyHistory(attempts = 0, correct = 0) {
  const totalAttempts = Math.max(0, Number(attempts || 0));
  const totalCorrect = Math.max(0, Math.min(totalAttempts, Number(correct || 0)));
  const history = [];

  for (let index = 0; index < totalCorrect; index += 1) {
    history.push({ correct: true, answeredAt: null, confidence: "high", slow: false, timedOut: false });
  }

  for (let index = totalCorrect; index < totalAttempts; index += 1) {
    history.push({ correct: false, answeredAt: null, confidence: "low", slow: false, timedOut: false });
  }

  return history.slice(-200);
}

function normalizeWord(word) {
  const migratedStats = createDefaultStats(word.stats || {
    attempts: word.attempts,
    correct: word.correct,
    shows: word.shows,
    autoShows: word.autoShows,
    manualShows: word.manualShows,
    lastSeenAt: word.lastSeenAt,
    lastAnsweredAt: word.lastAnsweredAt,
  });

  return {
    id: word.id || uid(),
    pt: word.pt || "",
    en: word.en || "",
    phonetic: word.phonetic || "",
    audioDataUrl: word.audioDataUrl || null,
    createdAt: word.createdAt || nowIso(),
    stats: migratedStats,
  };
}

function normalizeGroup(group) {
  return {
    id: group.id || uid(),
    name: group.name || "Grupo sem nome",
    description: group.description || "",
    createdAt: group.createdAt || nowIso(),
    words: Array.isArray(group.words) ? group.words.map(normalizeWord) : [],
  };
}

function createEmptyStudyStats() {
  return {
    answered: 0,
    correct: 0,
    targetCorrect: 0,
    maxAttempts: 0,
    mode: "manual",
    completedCounted: false,
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.groups = (parsed.groups || []).map(normalizeGroup);
    state.settings.accuracyWindowSize = sanitizeAccuracyWindowSize(parsed.settings?.accuracyWindowSize);
    state.settings.dailyRoundGoal = sanitizeDailyRoundGoal(parsed.settings?.dailyRoundGoal);
    state.activityByDate = parsed.activityByDate || {};
  } catch (error) {
    console.error("Falha ao carregar dados salvos", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    groups: state.groups,
    settings: state.settings,
    activityByDate: state.activityByDate,
  }));
}

function getSelectedGroup() {
  return state.groups.find((group) => group.id === state.selectedGroupId) || null;
}

function ensureSelectedGroup() {
  if (!state.selectedGroupId && state.groups.length) {
    state.selectedGroupId = state.groups[0].id;
  }
}

function syncStudySelection() {
  const validIds = state.groups.map((group) => group.id);
  state.selectedStudyGroupIds = state.selectedStudyGroupIds.filter((id) => validIds.includes(id));

  if (!state.selectedStudyGroupIds.length && validIds.length) {
    state.selectedStudyGroupIds = [...validIds];
  }
}

function clearObjectUrl(url) {
  if (url) URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeAnswerText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeAccuracyWindowSize(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(5, Math.min(100, Math.round(parsed)));
}

function sanitizeDailyRoundGoal(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  return Math.max(1, Math.min(20, Math.round(parsed)));
}

function getAccuracyWindowSize() {
  return sanitizeAccuracyWindowSize(state.settings.accuracyWindowSize);
}

function getDailyRoundGoal() {
  return sanitizeDailyRoundGoal(state.settings.dailyRoundGoal);
}

function getRecentHistory(word, size = getAccuracyWindowSize()) {
  const history = Array.isArray(word.stats.history) ? word.stats.history : [];
  return history.slice(-size);
}

function getRecentErrorCount(word) {
  return getRecentHistory(word).filter((item) => !item.correct).length;
}

function getRecentLowConfidenceCount(word) {
  return getRecentHistory(word).filter((item) => item.correct && item.confidence === "low").length;
}

function getRecentSlowCount(word) {
  return getRecentHistory(word).filter((item) => item.slow).length;
}

function getWordAccuracy(word) {
  const recentHistory = getRecentHistory(word);
  if (!recentHistory.length) return 0;
  const recentCorrect = recentHistory.filter((item) => item.correct).length;
  return (recentCorrect / recentHistory.length) * 100;
}

function getWordAgeInDays(word) {
  const createdAt = new Date(word.createdAt).getTime();
  const diffMs = Date.now() - createdAt;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getAutoWeight(word) {
  const accuracy = getWordAccuracy(word);
  const ageDays = getWordAgeInDays(word);
  const history = Array.isArray(word.stats.history) ? word.stats.history : [];
  const masteryStartIndex = word.stats.masteryStartIndex;
  const recentErrors = getRecentErrorCount(word);
  const recentLowConfidence = getRecentLowConfidenceCount(word);
  const recentSlow = getRecentSlowCount(word);

  if (ageDays < 3) {
    return 100;
  }

  if (recentErrors > 0) {
    return 100;
  }

  if (accuracy < 100 || masteryStartIndex === null) {
    return 100;
  }

  const postMasteryHistory = history.slice(masteryStartIndex);
  const extraCorrectAfterMastery = postMasteryHistory.filter((item) => item.correct).length;

  if (extraCorrectAfterMastery < 10) {
    return 100;
  }

  const reductionSteps = extraCorrectAfterMastery - 9;
  let weight = Math.max(5, 100 - reductionSteps * 5);

  if (recentLowConfidence > 0) {
    weight = Math.max(weight, 55);
  }

  if (recentSlow > 1) {
    weight = Math.max(weight, 45);
  }

  return weight;
}

function getAllWordEntries() {
  return state.groups.flatMap((group) =>
    group.words.map((word) => ({
      group,
      word,
      autoWeight: getAutoWeight(word),
    }))
  );
}

function getAutoAppearancePercent(wordId) {
  const entries = getAllWordEntries();
  const totalWeight = entries.reduce((sum, entry) => sum + entry.autoWeight, 0);
  const current = entries.find((entry) => entry.word.id === wordId);
  if (!current || totalWeight === 0) return 0;
  return (current.autoWeight / totalWeight) * 100;
}

function syncWordMasteryStatus(word) {
  const accuracy = getWordAccuracy(word);
  const ageDays = getWordAgeInDays(word);
  const historyLength = Array.isArray(word.stats.history) ? word.stats.history.length : 0;

  if (ageDays < 3 || accuracy < 100 || historyLength === 0 || getRecentErrorCount(word) > 0) {
    word.stats.masteryStartIndex = null;
    return;
  }

  if (word.stats.masteryStartIndex === null) {
    word.stats.masteryStartIndex = historyLength;
  }
}

function syncAllMasteryStatuses() {
  state.groups.forEach((group) => {
    group.words.forEach((word) => {
      syncWordMasteryStatus(word);
    });
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function setWordFormEnabled(enabled) {
  elements.ptInput.disabled = !enabled;
  elements.enInput.disabled = !enabled;
  elements.phoneticInput.disabled = !enabled;
  elements.recordBtn.disabled = !enabled;
  elements.saveWordBtn.disabled = !enabled;
}

function resetRecordingState() {
  clearObjectUrl(state.selectedAudioUrl);
  state.selectedAudioBlob = null;
  state.selectedAudioUrl = null;
  state.recorderChunks = [];
  elements.playRecordingBtn.disabled = true;
  elements.clearRecordingBtn.disabled = true;
}

function resetWordForm() {
  elements.wordForm.reset();
  resetRecordingState();
  state.editingWordId = null;
  elements.stopBtn.disabled = true;
  elements.saveWordBtn.textContent = state.selectedGroupId ? "Salvar palavra" : "Salvar palavra";
  elements.cancelEditBtn.disabled = true;
  elements.recordingStatus.textContent = state.selectedGroupId
    ? "Se quiser, grave a pronuncia antes de salvar."
    : "Selecione um grupo para habilitar a gravacao.";
}

function getEditingWord() {
  const group = getSelectedGroup();
  if (!group || !state.editingWordId) return null;
  return group.words.find((word) => word.id === state.editingWordId) || null;
}

function startEditWord(wordId) {
  const group = getSelectedGroup();
  if (!group) return;

  const word = group.words.find((item) => item.id === wordId);
  if (!word) return;

  state.editingWordId = word.id;
  resetRecordingState();
  elements.ptInput.value = word.pt;
  elements.enInput.value = word.en;
  elements.phoneticInput.value = word.phonetic || "";
  elements.saveWordBtn.textContent = "Atualizar palavra";
  elements.cancelEditBtn.disabled = false;
  elements.recordingStatus.textContent = word.audioDataUrl
    ? "Edicao ativa. Se nao gravar outro audio, o audio atual sera mantido."
    : "Edicao ativa. Grave um audio se quiser adicionar pronuncia.";
}

function getCurrentStudyMode() {
  return elements.studyModeInputs.find((input) => input.checked)?.value || "manual";
}

function getRoundSize() {
  const value = Number(elements.roundSizeInput.value);
  return Math.max(1, Math.min(50, Number.isFinite(value) ? value : DEFAULT_ROUND_SIZE));
}

function getMaxAttempts() {
  const value = Number(elements.maxAttemptsInput.value);
  const fallback = Math.max(DEFAULT_ROUND_SIZE * 2, getRoundSize());
  return Math.max(getRoundSize(), Math.min(100, Number.isFinite(value) ? value : fallback));
}

function getTimerSeconds() {
  const value = Number(elements.timerInput.value);
  return Math.max(0, Number.isFinite(value) ? value : DEFAULT_TIMER_SECONDS);
}

function openView(viewName) {
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });

  Object.entries(elements.views).forEach(([name, node]) => {
    node.classList.toggle("active", name === viewName);
  });

  if (viewName === "dashboard") {
    renderDashboard();
  }
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDailyActivity(key = getTodayKey()) {
  if (!state.activityByDate[key]) {
    state.activityByDate[key] = {
      completedRounds: 0,
      lastUsedAt: null,
    };
  }

  return state.activityByDate[key];
}

function recordCompletedRound() {
  const activity = getDailyActivity();
  activity.completedRounds += 1;
  activity.lastUsedAt = nowIso();
  saveState();
  updateStreakDisplay();
  renderDashboard();
}

function getCurrentStreakDays() {
  let streak = 0;
  const cursor = new Date();
  const dailyGoal = getDailyRoundGoal();

  while (true) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    const key = `${year}-${month}-${day}`;
    const activity = state.activityByDate[key];

    if (!activity || Number(activity.completedRounds || 0) < dailyGoal) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function hasMetDailyGoal(roundCount) {
  return Number(roundCount || 0) >= getDailyRoundGoal();
}

function updateStreakDisplay() {
  const streak = getCurrentStreakDays();
  const todayRounds = Number((state.activityByDate[getTodayKey()] || {}).completedRounds || 0);
  const metGoal = hasMetDailyGoal(todayRounds);
  const remaining = Math.max(0, getDailyRoundGoal() - todayRounds);
  elements.sidebarStreakDisplay.textContent = `${streak} ${streak === 1 ? "dia" : "dias"}`;
  elements.sidebarRoundsDisplay.textContent = `${todayRounds}/${getDailyRoundGoal()}`;
  elements.sidebarGoalStatus.textContent = metGoal
    ? "Meta cumprida hoje"
    : `Faltam ${remaining} rodada${remaining === 1 ? "" : "s"}`;
  elements.sidebarRoundsCard.classList.toggle("success", metGoal);
}

function updateStudyTopFeedback() {
  const card = state.currentCard;
  const result = state.currentResult;

  if (!card || !result) {
    elements.studyTopFeedback.classList.add("hidden");
    elements.studyTopResult.textContent = "Nenhum resultado ainda.";
    elements.audioAnswerBtn.disabled = true;
    elements.nextCardBtn.disabled = true;
    return;
  }

  const status = result.isCorrect ? "Acertou" : result.timedOut ? "Tempo esgotado" : "Errou";
  const answerSnippet = result.isCorrect ? "Pode seguir para a proxima." : `Resposta correta: ${card.answer}`;
  elements.studyTopResult.innerHTML = `<strong>${escapeHtml(status)}</strong> <span>${escapeHtml(answerSnippet)}</span>`;
  elements.studyTopFeedback.classList.remove("hidden");
  elements.audioAnswerBtn.disabled = !card.audioDataUrl;
  elements.nextCardBtn.disabled = false;
  elements.nextCardBtn.textContent = state.studyDeck.length ? "Proxima palavra" : "Finalizar rodada";
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function shuffle(items) {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[randomIndex]] = [clone[randomIndex], clone[index]];
  }
  return clone;
}

function renderGroups() {
  elements.groupCount.textContent = `${state.groups.length} grupo${state.groups.length === 1 ? "" : "s"}`;

  if (!state.groups.length) {
    elements.groupList.className = "group-list empty-state-box";
    elements.groupList.textContent = "Nenhum grupo criado ainda.";
    return;
  }

  elements.groupList.className = "group-list";
  elements.groupList.innerHTML = state.groups.map((group) => `
    <article class="group-item ${group.id === state.selectedGroupId ? "active" : ""}" data-group-id="${group.id}">
      <div class="group-item-header">
        <button class="group-select-btn" data-group-id="${group.id}">${escapeHtml(group.name)}</button>
        <span class="pill">${group.words.length} palavra${group.words.length === 1 ? "" : "s"}</span>
      </div>
      <p>${escapeHtml(group.description || "Sem descricao.")}</p>
      <div class="word-actions">
        <button class="ghost-btn delete-group-btn" data-group-id="${group.id}">Excluir grupo</button>
      </div>
    </article>
  `).join("");
}

function renderWords() {
  const group = getSelectedGroup();

  if (!group) {
    elements.wordCount.textContent = "0 palavras";
    elements.wordList.className = "word-list empty-state-box";
    elements.wordList.textContent = "Nenhum grupo selecionado.";
    return;
  }

  const words = group.words || [];
  elements.wordCount.textContent = `${words.length} palavra${words.length === 1 ? "" : "s"}`;

  if (!words.length) {
    elements.wordList.className = "word-list empty-state-box";
    elements.wordList.textContent = "Esse grupo ainda nao tem palavras.";
    return;
  }

  elements.wordList.className = "word-list";
  elements.wordList.innerHTML = words.map((word) => `
    <article class="word-item">
      <div class="word-item-header">
        <strong>${escapeHtml(word.pt)} / ${escapeHtml(word.en)}</strong>
        <span class="pill">peso auto ${getAutoWeight(word)}%</span>
      </div>
      <p><strong>Fonetica:</strong> ${escapeHtml(word.phonetic || "Nao informada")}</p>
      <p><strong>Acerto ultimas ${getAccuracyWindowSize()}:</strong> ${formatPercent(getWordAccuracy(word))} | <strong>Aparicao auto:</strong> ${formatPercent(getAutoAppearancePercent(word.id))}</p>
      <div class="word-actions">
        <button class="secondary-btn edit-word-btn" data-word-id="${word.id}">Editar</button>
        <button class="secondary-btn play-word-btn" data-word-id="${word.id}" ${word.audioDataUrl ? "" : "disabled"}>Ouvir audio</button>
        <button class="ghost-btn delete-word-btn" data-word-id="${word.id}">Excluir</button>
      </div>
    </article>
  `).join("");
}

function renderWordEditor() {
  const group = getSelectedGroup();
  const enabled = Boolean(group);

  setWordFormEnabled(enabled);

  if (!group) {
    elements.editorTitle.textContent = "Selecione um grupo";
    elements.editorSubtitle.textContent = "Escolha um grupo na lista para adicionar palavras.";
    resetWordForm();
    renderWords();
    return;
  }

  elements.editorTitle.textContent = `Grupo: ${group.name}`;
  elements.editorSubtitle.textContent = state.editingWordId
    ? "Voce esta editando uma palavra desse grupo."
    : (group.description || "Adicione palavras e a gravacao de pronuncia.");
  if (!state.editingWordId) {
    elements.recordingStatus.textContent = "Se quiser, grave a pronuncia antes de salvar.";
    elements.saveWordBtn.textContent = "Salvar palavra";
    elements.cancelEditBtn.disabled = true;
  }
  renderWords();
}

function renderStudyGroupOptions() {
  if (!state.groups.length) {
    elements.studyGroupList.className = "checkbox-list empty-state-box";
    elements.studyGroupList.textContent = "Crie grupos no cadastro para poder estudar.";
    return;
  }

  elements.studyGroupList.className = "checkbox-list";
  elements.studyGroupList.innerHTML = state.groups.map((group) => `
    <label class="checkbox-item">
      <input type="checkbox" value="${group.id}" ${state.selectedStudyGroupIds.includes(group.id) ? "checked" : ""}>
      <span>${escapeHtml(group.name)} (${group.words.length})</span>
    </label>
  `).join("");
}

function updateStudyModeUi() {
  elements.manualSelectionBox.style.display = getCurrentStudyMode() === "manual" ? "block" : "none";
}

function updateStudySummary() {
  const mode = getCurrentStudyMode();
  const targetCorrect = getRoundSize();
  const maxAttempts = getMaxAttempts();

  if (mode === "automatic") {
    const words = getAllWordEntries();
    const averageWeight = words.length
      ? words.reduce((sum, entry) => sum + entry.autoWeight, 0) / words.length
      : 0;

    elements.studySummary.textContent = `${words.length} palavra${words.length === 1 ? "" : "s"} no automatico. Meta de ${targetCorrect} acerto${targetCorrect === 1 ? "" : "s"} com limite de ${maxAttempts} tentativa${maxAttempts === 1 ? "" : "s"}. Peso medio ${formatPercent(averageWeight)}.`;
    return;
  }

  if (mode === "review") {
    const reviewCount = getAllWordEntries().filter((entry) => getRecentErrorCount(entry.word) > 0).length;
    elements.studySummary.textContent = `${reviewCount} palavra${reviewCount === 1 ? "" : "s"} com erros recentes. Meta de ${targetCorrect} acerto${targetCorrect === 1 ? "" : "s"} com limite de ${maxAttempts} tentativa${maxAttempts === 1 ? "" : "s"}.`;
    return;
  }

  const manualCount = state.groups
    .filter((group) => state.selectedStudyGroupIds.includes(group.id))
    .reduce((sum, group) => sum + group.words.length, 0);

  elements.studySummary.textContent = `${manualCount} palavra${manualCount === 1 ? "" : "s"} disponiveis no manual. Meta de ${targetCorrect} acerto${targetCorrect === 1 ? "" : "s"} com limite de ${maxAttempts} tentativa${maxAttempts === 1 ? "" : "s"}.`;
}

function updateScoreDisplay() {
  const target = state.studyStats.targetCorrect || getRoundSize();
  elements.scoreDisplay.textContent = `${state.studyStats.correct} / ${target}`;
}

function updateTimerDisplay() {
  if (!state.currentCard) {
    elements.timerDisplay.textContent = "--";
    return;
  }

  const seconds = getTimerSeconds();
  if (seconds <= 0) {
    elements.timerDisplay.textContent = "Livre";
    return;
  }

  elements.timerDisplay.textContent = `${state.timerRemaining}s`;
}

function renderStudyCard() {
  const card = state.currentCard;

  if (!card) {
    elements.studyCard.className = "study-card empty";
    elements.studyCard.innerHTML = `<p class="panel-muted">Nenhuma rodada iniciada.</p>`;
    updateStudyTopFeedback();
    updateScoreDisplay();
    updateTimerDisplay();
    return;
  }

  const result = state.currentResult;
  const questionLabel = card.direction === "pt-en" ? "Traduzir para ingles" : "Traduzir para portugues";
  const answerDisabled = result ? "disabled" : "";
  const submitDisabled = result ? "disabled" : "";
  const resultClass = !result ? "" : result.isCorrect ? "good" : "bad";
  const resultVisible = result ? "visible" : "";
  const titleClass = result?.isCorrect ? "good-text" : "bad-text";
  const titleText = !result ? "" : result.isCorrect ? "Voce acertou" : result.timedOut ? "Tempo esgotado" : "Voce errou";
  const attemptPosition = Math.min(state.studyStats.answered + 1, state.studyStats.maxAttempts || getMaxAttempts());
  const resultContent = !result ? "" : `
    <details class="result-details">
      <summary>Ver detalhes da correcao</summary>
      <div class="result-details-content">
        <div class="result-title ${titleClass}">${titleText}</div>
        <p><strong>Sua resposta:</strong> ${escapeHtml(result.userAnswer || "(vazia)")}</p>
        <p><strong>Confianca:</strong> ${escapeHtml(result.confidenceLabel || "Nao informada")}</p>
        <p><strong>Resposta correta:</strong> ${escapeHtml(card.answer)}</p>
        <p><strong>Fonetica:</strong> ${escapeHtml(card.phonetic || "Nao informada")}</p>
        <div class="result-actions">
          <span class="pill">${formatPercent(card.autoAppearancePercent)} de aparicao no automatico</span>
          <span class="pill">peso ${card.autoWeight}%</span>
        </div>
      </div>
    </details>
  `;

  elements.studyCard.className = "study-card";
  elements.studyCard.innerHTML = `
    <div>
      <div class="study-meta">
        <span class="pill">${questionLabel}</span>
        <span class="pill">${escapeHtml(card.groupName)} | tentativa ${attemptPosition}/${state.studyStats.maxAttempts || getMaxAttempts()}</span>
      </div>
      <p class="study-prompt">${escapeHtml(card.prompt)}</p>
      <p class="panel-muted">Digite a traducao e pressione Enter. O app compara sua resposta e mostra o resultado.</p>
    </div>

    <form class="answer-form" id="answer-form">
      <label>Sua resposta
        <input id="answer-input" type="text" placeholder="Digite aqui e pressione Enter" autocomplete="off" ${answerDisabled}>
      </label>
      <label>Confianca na resposta
        <select id="confidence-input" ${answerDisabled}>
          <option value="high">Acertei com certeza</option>
          <option value="low">Acertei com duvida</option>
        </select>
      </label>
      <button class="secondary-btn" type="submit" ${submitDisabled}>Confirmar resposta</button>
    </form>

    <div class="result-box ${resultClass} ${resultVisible}">
      ${resultContent}
    </div>
  `;

  updateStudyTopFeedback();
  updateScoreDisplay();
  updateTimerDisplay();

  if (!result) {
    const answerInput = document.getElementById("answer-input");
    if (answerInput) answerInput.focus();
  }
}

function renderDashboard() {
  const entries = getAllWordEntries();
  const totalWords = entries.length;
  const totalAttempts = entries.reduce((sum, entry) => sum + entry.word.stats.attempts, 0);
  const totalCorrect = entries.reduce((sum, entry) => sum + entry.word.stats.correct, 0);
  const overallAccuracy = totalAttempts ? (totalCorrect / totalAttempts) * 100 : 0;
  const highPriorityCount = entries.filter((entry) => entry.autoWeight >= 70).length;
  const streakDays = getCurrentStreakDays();
  const todayRounds = Number((state.activityByDate[getTodayKey()] || {}).completedRounds || 0);
  const metDailyGoal = hasMetDailyGoal(todayRounds);

  elements.accuracyWindowInput.value = String(getAccuracyWindowSize());
  elements.dailyRoundGoalInput.value = String(getDailyRoundGoal());
  elements.dashboardCount.textContent = `${totalWords} palavra${totalWords === 1 ? "" : "s"}`;
  elements.dashboardSummary.innerHTML = `
    <article class="metric-card">
      <span>Total de palavras</span>
      <strong>${totalWords}</strong>
    </article>
    <article class="metric-card">
      <span>Tentativas totais</span>
      <strong>${totalAttempts}</strong>
    </article>
    <article class="metric-card">
      <span>Acerto geral</span>
      <strong>${formatPercent(overallAccuracy)}</strong>
    </article>
    <article class="metric-card">
      <span>Alta prioridade no automatico</span>
      <strong>${highPriorityCount}</strong>
    </article>
    <article class="metric-card">
      <span>Janela do acerto</span>
      <strong>${getAccuracyWindowSize()}</strong>
    </article>
    <article class="metric-card">
      <span>Streak atual</span>
      <strong>${streakDays} ${streakDays === 1 ? "dia" : "dias"}</strong>
    </article>
    <article class="metric-card ${metDailyGoal ? "success" : ""}">
      <span>Rodadas hoje</span>
      <strong>${todayRounds}/${getDailyRoundGoal()}</strong>
    </article>
    <article class="metric-card">
      <span>Meta diaria</span>
      <strong>${getDailyRoundGoal()}</strong>
    </article>
  `;

  if (!entries.length) {
    elements.dashboardWordList.className = "dashboard-list empty-state-box";
    elements.dashboardWordList.textContent = "Adicione palavras para acompanhar as metricas.";
    return;
  }

  const sorted = [...entries].sort((left, right) => {
    const accuracyDiff = getWordAccuracy(left.word) - getWordAccuracy(right.word);
    if (accuracyDiff !== 0) return accuracyDiff;
    return right.autoWeight - left.autoWeight;
  });

  elements.dashboardWordList.className = "dashboard-list";
  elements.dashboardWordList.innerHTML = sorted.map(({ group, word, autoWeight }) => `
    <article class="dashboard-item">
      <div class="word-item-header">
        <strong>${escapeHtml(word.pt)} / ${escapeHtml(word.en)}</strong>
        <span class="pill">${escapeHtml(group.name)}</span>
      </div>
      <div class="dashboard-tags">
        <span class="pill">acerto ${formatPercent(getWordAccuracy(word))} nas ultimas ${getAccuracyWindowSize()}</span>
        <span class="pill">aparicao ${formatPercent(getAutoAppearancePercent(word.id))}</span>
        <span class="pill">peso ${autoWeight}%</span>
        <span class="pill">tentativas ${word.stats.attempts}</span>
        <span class="pill">exibicoes ${word.stats.shows}</span>
      </div>
      <p><strong>Fonetica:</strong> ${escapeHtml(word.phonetic || "Nao informada")}</p>
      <div class="word-actions">
        <button class="ghost-btn reset-word-stats-btn" data-word-id="${word.id}">Resetar estatisticas</button>
      </div>
    </article>
  `).join("");
}

function renderAll() {
  ensureSelectedGroup();
  syncStudySelection();
  syncAllMasteryStatuses();
  renderGroups();
  renderWordEditor();
  renderStudyGroupOptions();
  updateStudyModeUi();
  updateStudySummary();
  renderDashboard();
}

function createGroup() {
  const name = elements.groupNameInput.value.trim();
  const description = elements.groupDescriptionInput.value.trim();

  if (!name) {
    alert("Digite um nome para o grupo.");
    return;
  }

  state.groups.unshift({
    id: uid(),
    name,
    description,
    createdAt: nowIso(),
    words: [],
  });

  state.selectedGroupId = state.groups[0].id;
  syncStudySelection();
  saveState();
  renderAll();
  elements.groupDialog.close();
  elements.groupNameInput.value = "";
  elements.groupDescriptionInput.value = "";
}

function deleteGroup(groupId) {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) {
    return;
  }

  const confirmed = window.confirm(`Excluir o grupo "${group.name}" e todas as palavras dele?`);
  if (!confirmed) {
    return;
  }

  state.groups = state.groups.filter((item) => item.id !== groupId);

  if (state.selectedGroupId === groupId) {
    state.selectedGroupId = state.groups[0]?.id || null;
  }

  if (state.editingWordId) {
    const stillExists = state.groups.some((item) => item.words.some((word) => word.id === state.editingWordId));
    if (!stillExists) {
      resetWordForm();
    }
  }

  syncStudySelection();
  saveState();
  renderAll();
}

async function createWord(event) {
  event.preventDefault();
  const group = getSelectedGroup();

  if (!group) {
    alert("Selecione um grupo antes de salvar.");
    return;
  }

  const pt = elements.ptInput.value.trim();
  const en = elements.enInput.value.trim();
  const phonetic = elements.phoneticInput.value.trim();

  if (!pt || !en) {
    alert("Preencha Portugues e Ingles.");
    return;
  }

  let audioDataUrl = null;
  if (state.selectedAudioBlob) {
    audioDataUrl = await blobToDataUrl(state.selectedAudioBlob);
  }

  const editingWord = getEditingWord();

  if (editingWord) {
    editingWord.pt = pt;
    editingWord.en = en;
    editingWord.phonetic = phonetic;
    if (audioDataUrl) {
      editingWord.audioDataUrl = audioDataUrl;
    }
  } else {
    group.words.unshift(normalizeWord({
      id: uid(),
      pt,
      en,
      phonetic,
      audioDataUrl,
      createdAt: nowIso(),
      stats: createDefaultStats(),
    }));
  }

  saveState();
  resetWordForm();
  renderAll();
}

function deleteWord(wordId) {
  const group = getSelectedGroup();
  if (!group) return;

  group.words = group.words.filter((word) => word.id !== wordId);
  if (state.editingWordId === wordId) {
    resetWordForm();
  }
  saveState();
  renderAll();
}

function resetWordStats(wordId) {
  const found = state.groups
    .flatMap((group) => group.words)
    .find((word) => word.id === wordId);

  if (!found) {
    return;
  }

  const confirmed = window.confirm(`Resetar as estatisticas da palavra "${found.pt} / ${found.en}"?`);
  if (!confirmed) {
    return;
  }

  found.stats = createDefaultStats();
  saveState();
  renderAll();
}

function resetAllStats() {
  const confirmed = window.confirm("Resetar todas as estatisticas gerais do app sem apagar grupos e palavras?");
  if (!confirmed) {
    return;
  }

  state.groups.forEach((group) => {
    group.words.forEach((word) => {
      word.stats = createDefaultStats();
    });
  });

  state.activityByDate = {};
  state.studyDeck = [];
  state.currentCard = null;
  state.currentResult = null;
  clearStudyTimer();
  state.studyStats = createEmptyStudyStats();
  saveState();
  renderAll();
  updateScoreDisplay();
  updateTimerDisplay();
  updateStudyTopFeedback();
  renderStudyCard();
}

function playSavedAudio(dataUrl) {
  const audio = new Audio(dataUrl);
  audio.play().catch(() => {
    alert("Nao foi possivel tocar o audio.");
  });
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Seu navegador nao permite gravacao de audio nessa pagina.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.recorderChunks = [];
    state.mediaRecorder = new MediaRecorder(stream);

    state.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        state.recorderChunks.push(event.data);
      }
    };

    state.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(state.recorderChunks, { type: "audio/webm" });
      resetRecordingState();
      state.selectedAudioBlob = audioBlob;
      state.selectedAudioUrl = URL.createObjectURL(audioBlob);
      elements.playRecordingBtn.disabled = false;
      elements.clearRecordingBtn.disabled = false;
      elements.recordingStatus.textContent = "Gravacao pronta para ser salva com a palavra.";
      stream.getTracks().forEach((track) => track.stop());
    };

    state.mediaRecorder.start();
    elements.recordBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.recordingStatus.textContent = "Gravando... fale a pronuncia e depois clique em Parar.";
  } catch (error) {
    console.error(error);
    alert("Nao consegui acessar o microfone. Verifique a permissao do navegador.");
  }
}

function stopRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    state.mediaRecorder.stop();
    elements.recordBtn.disabled = false;
    elements.stopBtn.disabled = true;
  }
}

function chooseDirection(baseDirection) {
  if (baseDirection === "mixed") {
    return Math.random() > 0.5 ? "pt-en" : "en-pt";
  }
  return baseDirection;
}

function createCardFromEntry(entry, direction, order) {
  const finalDirection = chooseDirection(direction);
  const prompt = finalDirection === "pt-en" ? entry.word.pt : entry.word.en;
  const answer = finalDirection === "pt-en" ? entry.word.en : entry.word.pt;

  return {
    order,
    groupId: entry.group.id,
    wordId: entry.word.id,
    groupName: entry.group.name,
    direction: finalDirection,
    prompt,
    answer,
    phonetic: entry.word.phonetic,
    audioDataUrl: entry.word.audioDataUrl,
    autoWeight: entry.autoWeight,
    autoAppearancePercent: getAutoAppearancePercent(entry.word.id),
    studyMode: state.studyStats.mode,
    repeatCount: 0,
  };
}

function sampleWeightedEntries(entries, size) {
  const available = [...entries];
  const picked = [];

  while (available.length && picked.length < size) {
    const totalWeight = available.reduce((sum, entry) => sum + entry.autoWeight, 0);
    let cursor = Math.random() * totalWeight;
    let pickedIndex = 0;

    for (let index = 0; index < available.length; index += 1) {
      cursor -= available[index].autoWeight;
      if (cursor <= 0) {
        pickedIndex = index;
        break;
      }
    }

    picked.push(available.splice(pickedIndex, 1)[0]);
  }

  return picked;
}

function buildStudyDeck() {
  const mode = getCurrentStudyMode();
  const direction = elements.promptDirection.value;
  const maxAttempts = getMaxAttempts();

  state.studyStats.mode = mode;

  let entries = [];

  if (mode === "manual") {
    entries = getAllWordEntries().filter((entry) => state.selectedStudyGroupIds.includes(entry.group.id));
    entries = buildRepeatedEntryQueue(entries, maxAttempts);
  } else if (mode === "review") {
    entries = buildRepeatedEntryQueue(getAllWordEntries()
      .filter((entry) => getRecentErrorCount(entry.word) > 0)
      .sort((left, right) => {
        const errorDiff = getRecentErrorCount(right.word) - getRecentErrorCount(left.word);
        if (errorDiff !== 0) return errorDiff;
        return right.autoWeight - left.autoWeight;
      }), maxAttempts);
  } else {
    const allEntries = getAllWordEntries();
    entries = buildWeightedEntryQueue(allEntries, maxAttempts);
  }

  return entries.map((entry, index) => createCardFromEntry(entry, direction, index + 1));
}

function buildRepeatedEntryQueue(entries, size) {
  if (!entries.length || size <= 0) {
    return [];
  }

  const queue = [];
  let pool = shuffle(entries);

  while (queue.length < size) {
    if (!pool.length) {
      pool = shuffle(entries);
    }

    queue.push(pool.shift());
  }

  return queue;
}

function buildWeightedEntryQueue(entries, size) {
  if (!entries.length || size <= 0) {
    return [];
  }

  const queue = [];
  while (queue.length < size) {
    queue.push(...sampleWeightedEntries(entries, 1));
  }

  return queue.slice(0, size);
}

function clearStudyTimer() {
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
}

function startTimerForCurrentCard() {
  clearStudyTimer();

  const seconds = getTimerSeconds();
  if (seconds <= 0 || !state.currentCard) {
    state.timerRemaining = null;
    updateTimerDisplay();
    return;
  }

  state.timerRemaining = seconds;
  updateTimerDisplay();

  state.timerIntervalId = window.setInterval(() => {
    state.timerRemaining -= 1;
    updateTimerDisplay();

    if (state.timerRemaining <= 0) {
      clearStudyTimer();
      finalizeCurrentAnswer("", true, "low");
    }
  }, 1000);
}

function findWordByIds(groupId, wordId) {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) return null;

  const word = group.words.find((item) => item.id === wordId);
  if (!word) return null;

  return { group, word };
}

function markCardAsShown(card) {
  const found = findWordByIds(card.groupId, card.wordId);
  if (!found) return;

  found.word.stats.shows += 1;
  found.word.stats.lastSeenAt = nowIso();

  if (card.studyMode === "automatic") {
    found.word.stats.autoShows += 1;
  } else {
    found.word.stats.manualShows += 1;
  }

  saveState();
}

function showNextCard() {
  const reachedTarget = state.studyStats.correct >= state.studyStats.targetCorrect;
  const reachedAttemptLimit = state.studyStats.answered >= state.studyStats.maxAttempts;

  if (reachedTarget || reachedAttemptLimit) {
    if (!state.studyStats.completedCounted) {
      state.studyStats.completedCounted = true;
      recordCompletedRound();
    }
    clearStudyTimer();
    state.currentCard = null;
    state.currentResult = null;
    renderStudyCard();
    elements.studyTopFeedback.classList.add("hidden");
    elements.studySummary.textContent = reachedTarget
      ? "Meta de acertos concluida. Clique em comecar estudo para iniciar outra rodada."
      : "Limite de tentativas atingido. Clique em comecar estudo para iniciar outra rodada.";
    return;
  }

  state.currentCard = state.studyDeck.shift() || null;
  state.currentResult = null;

  if (!state.currentCard) {
    if (state.studyStats.maxAttempts > 0 && !state.studyStats.completedCounted) {
      state.studyStats.completedCounted = true;
      recordCompletedRound();
    }
    clearStudyTimer();
    renderStudyCard();
    elements.studySummary.textContent = "Nao ha mais cartas disponiveis. Clique em comecar estudo para montar outra rodada.";
    return;
  }

  markCardAsShown(state.currentCard);
  renderStudyCard();
  startTimerForCurrentCard();
}

function startStudySession() {
  clearStudyTimer();
  state.studyDeck = buildStudyDeck();

  if (!state.studyDeck.length) {
    state.currentCard = null;
    state.currentResult = null;
    state.studyStats = createEmptyStudyStats();
    state.studyStats.mode = getCurrentStudyMode();
    renderStudyCard();
    updateStudySummary();
    alert("Nenhuma palavra disponivel para esse modo agora.");
    return;
  }

  state.studyStats = {
    answered: 0,
    correct: 0,
    targetCorrect: getRoundSize(),
    maxAttempts: getMaxAttempts(),
    mode: getCurrentStudyMode(),
    completedCounted: false,
  };

  showNextCard();
}

function scheduleAdaptiveRepeat(card, result) {
  const timerSeconds = getTimerSeconds();
  const wasSlow = Boolean(result.slow);
  const lowConfidence = result.confidence === "low";
  const needsRepeat = result.timedOut || !result.isCorrect || lowConfidence || wasSlow;

  if (!needsRepeat || Number(card.repeatCount || 0) >= 2) {
    return;
  }

  const repeatCard = {
    ...card,
    order: card.order + 1,
    repeatedFromWordId: card.wordId,
    repeatCount: Number(card.repeatCount || 0) + 1,
  };

  const remainingSlots = state.studyStats.maxAttempts - state.studyStats.answered - state.studyDeck.length;
  if (remainingSlots <= 0) {
    return;
  }

  const insertIndex = Math.min(2, state.studyDeck.length);
  state.studyDeck.splice(insertIndex, 0, repeatCard);

  if (timerSeconds > 0 && wasSlow && result.isCorrect) {
    elements.studySummary.textContent = "Resposta lenta: essa palavra vai reaparecer mais cedo na rodada.";
  }
}

function finalizeCurrentAnswer(userAnswer, timedOut = false, confidence = "high") {
  if (!state.currentCard || state.currentResult) {
    return;
  }

  clearStudyTimer();

  const timerSeconds = getTimerSeconds();
  const elapsedSeconds = timerSeconds > 0 && Number.isFinite(state.timerRemaining)
    ? Math.max(0, timerSeconds - state.timerRemaining)
    : 0;
  const normalizedUser = normalizeAnswerText(userAnswer);
  const normalizedExpected = normalizeAnswerText(state.currentCard.answer);
  const isCorrect = !timedOut && normalizedUser && normalizedUser === normalizedExpected;
  const slow = timerSeconds > 0 ? elapsedSeconds >= Math.ceil(timerSeconds * 0.75) : false;
  const found = findWordByIds(state.currentCard.groupId, state.currentCard.wordId);

  if (found) {
    found.word.stats.attempts += 1;
    found.word.stats.lastAnsweredAt = nowIso();
    found.word.stats.history.push({
      correct: Boolean(isCorrect),
      answeredAt: found.word.stats.lastAnsweredAt,
      confidence,
      slow,
      timedOut,
    });
    found.word.stats.history = found.word.stats.history.slice(-300);
    if (isCorrect) {
      found.word.stats.correct += 1;
    }
    syncWordMasteryStatus(found.word);
  }

  state.currentResult = {
    userAnswer,
    isCorrect,
    timedOut,
    confidence,
    confidenceLabel: timedOut ? "Tempo esgotado" : confidence === "low" ? "Respondeu com duvida" : "Respondeu com certeza",
    slow,
  };

  state.studyStats.answered += 1;
  if (isCorrect) {
    state.studyStats.correct += 1;
  }

  scheduleAdaptiveRepeat(state.currentCard, state.currentResult);
  saveState();
  renderStudyCard();
  renderWords();
  renderDashboard();
}

function handleAnswerSubmit(event) {
  const form = event.target.closest("#answer-form");
  if (!form) {
    return;
  }

  event.preventDefault();
  const input = form.querySelector("#answer-input");
  const confidenceInput = form.querySelector("#confidence-input");
  finalizeCurrentAnswer(input?.value || "", false, confidenceInput?.value || "high");
}

function bindEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => openView(tab.dataset.view));
  });

  elements.newGroupBtn.addEventListener("click", () => elements.groupDialog.showModal());
  elements.openStudySettingsBtn.addEventListener("click", () => elements.studySettingsDialog.showModal());
  elements.saveGroupBtn.addEventListener("click", createGroup);
  elements.wordForm.addEventListener("submit", createWord);
  elements.recordBtn.addEventListener("click", startRecording);
  elements.stopBtn.addEventListener("click", stopRecording);

  elements.playRecordingBtn.addEventListener("click", () => {
    if (state.selectedAudioUrl) {
      new Audio(state.selectedAudioUrl).play();
    }
  });

  elements.clearRecordingBtn.addEventListener("click", () => {
    resetRecordingState();
    elements.recordingStatus.textContent = "Audio removido. Voce pode gravar novamente.";
  });

  elements.groupList.addEventListener("click", (event) => {
    const selectButton = event.target.closest(".group-select-btn");
    const deleteGroupButton = event.target.closest(".delete-group-btn");

    if (deleteGroupButton) {
      deleteGroup(deleteGroupButton.dataset.groupId);
      return;
    }

    if (!selectButton) {
      return;
    }

    state.selectedGroupId = selectButton.dataset.groupId;
    resetWordForm();
    renderAll();
  });

  elements.wordList.addEventListener("click", (event) => {
    const editButton = event.target.closest(".edit-word-btn");
    const playButton = event.target.closest(".play-word-btn");
    const deleteButton = event.target.closest(".delete-word-btn");
    const group = getSelectedGroup();

    if (!group) {
      return;
    }

    if (editButton) {
      startEditWord(editButton.dataset.wordId);
      renderWordEditor();
      return;
    }

    if (playButton) {
      const word = group.words.find((item) => item.id === playButton.dataset.wordId);
      if (word?.audioDataUrl) {
        playSavedAudio(word.audioDataUrl);
      }
    }

    if (deleteButton) {
      deleteWord(deleteButton.dataset.wordId);
    }
  });

  elements.studyModeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      updateStudyModeUi();
      updateStudySummary();
    });
  });

  elements.studyGroupList.addEventListener("change", () => {
    state.selectedStudyGroupIds = [...elements.studyGroupList.querySelectorAll('input[type="checkbox"]:checked')]
      .map((input) => input.value);
    updateStudySummary();
  });

  elements.promptDirection.addEventListener("change", updateStudySummary);
  elements.timerInput.addEventListener("input", updateStudySummary);
  elements.roundSizeInput.addEventListener("input", updateStudySummary);
  elements.maxAttemptsInput.addEventListener("input", updateStudySummary);
  elements.accuracyWindowInput.addEventListener("input", () => {
    state.settings.accuracyWindowSize = sanitizeAccuracyWindowSize(elements.accuracyWindowInput.value);
    renderAll();
    saveState();
  });
  elements.dailyRoundGoalInput.addEventListener("input", () => {
    state.settings.dailyRoundGoal = sanitizeDailyRoundGoal(elements.dailyRoundGoalInput.value);
    renderAll();
    saveState();
  });
  elements.resetAllStatsBtn.addEventListener("click", resetAllStats);
  elements.cancelEditBtn.addEventListener("click", () => {
    resetWordForm();
    renderWordEditor();
  });
  elements.startStudyBtn.addEventListener("click", startStudySession);
  elements.nextCardBtn.addEventListener("click", showNextCard);

  elements.audioAnswerBtn.addEventListener("click", () => {
    if (state.currentCard?.audioDataUrl) {
      playSavedAudio(state.currentCard.audioDataUrl);
    }
  });

  elements.dashboardWordList.addEventListener("click", (event) => {
    const resetButton = event.target.closest(".reset-word-stats-btn");
    if (!resetButton) {
      return;
    }

    resetWordStats(resetButton.dataset.wordId);
  });

  elements.studyCard.addEventListener("submit", handleAnswerSubmit);
  window.addEventListener("beforeunload", clearStudyTimer);
}

function init() {
  loadState();
  ensureSelectedGroup();
  syncStudySelection();
  bindEvents();
  renderAll();
  saveState();
  updateScoreDisplay();
  updateTimerDisplay();
  updateStreakDisplay();
  renderStudyCard();
}

init();
