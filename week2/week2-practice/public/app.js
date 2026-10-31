const weatherLabels = {
  sunny: '☀️ 맑음',
  cloudy: '☁️ 흐림',
  rainy: '🌧️ 비',
  snowy: '❄️ 눈',
  windy: '🍃 바람',
};

const moodLabels = {
  happy: '😊 좋아요',
  calm: '😌 평온해요',
  ordinary: '🙂 보통이에요',
  tired: '😮‍💨 조금 지쳐요',
  sad: '😔 아쉬워요',
};

const dateInput = document.querySelector('#entry-date');
const selectedDateLabel = document.querySelector('#selected-date-label');
const form = document.querySelector('#diary-form');
const contentInput = document.querySelector('#diary-content');
const weatherInput = document.querySelector('#weather');
const moodInput = document.querySelector('#mood');
const characterCount = document.querySelector('#character-count');
const formMessage = document.querySelector('#form-message');
const saveButton = document.querySelector('#save-button');
const savedEntry = document.querySelector('#saved-entry');
const diaryList = document.querySelector('#diary-list');
const archiveEmpty = document.querySelector('#archive-empty');
const entryCount = document.querySelector('#entry-count');
const previousDayButton = document.querySelector('#previous-day');
const nextDayButton = document.querySelector('#next-day');

let diaries = [];
let selectedDate = getLocalDateString(new Date());
let isSaving = false;

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateLabel(dateString, options) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat('ko-KR', options).format(new Date(year, month - 1, day, 12));
}

function getEntryForDate(date) {
  return diaries.find((diary) => diary.date === date);
}

function renderSelectedDate() {
  selectedDate = dateInput.value;
  selectedDateLabel.textContent = getDateLabel(selectedDate, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  nextDayButton.disabled = selectedDate >= getLocalDateString(new Date());

  const diary = getEntryForDate(selectedDate);
  form.hidden = Boolean(diary);
  savedEntry.hidden = !diary;
  formMessage.textContent = '';

  if (diary) {
    document.querySelector('#saved-weather').textContent = weatherLabels[diary.weather];
    document.querySelector('#saved-mood').textContent = moodLabels[diary.mood];
    document.querySelector('#saved-content').textContent = diary.content;
  } else {
    form.reset();
    updateCharacterCount();
  }

  renderDiaryList();
}

function renderDiaryList() {
  diaryList.replaceChildren();
  entryCount.textContent = String(diaries.length);
  archiveEmpty.hidden = diaries.length > 0;

  diaries.forEach((diary) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `diary-item${diary.date === selectedDate ? ' is-selected' : ''}`;
    button.setAttribute('aria-label', `${getDateLabel(diary.date, {
      month: 'long',
      day: 'numeric',
    })} 일기 보기`);

    const date = document.createElement('span');
    date.className = 'diary-item-date';
    date.textContent = getDateLabel(diary.date, {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });

    const preview = document.createElement('span');
    preview.className = 'diary-item-preview';
    preview.textContent = diary.content;

    const meta = document.createElement('span');
    meta.className = 'diary-item-meta';
    meta.textContent = `${weatherLabels[diary.weather]}  ${moodLabels[diary.mood]}`;

    button.append(date, preview, meta);
    button.addEventListener('click', () => {
      dateInput.value = diary.date;
      renderSelectedDate();
    });
    diaryList.append(button);
  });
}

function updateCharacterCount() {
  const length = Array.from(contentInput.value).length;
  characterCount.textContent = `${length} / 500자`;
  characterCount.classList.toggle('is-over-limit', length > 500);
}

function changeSelectedDate(amount) {
  const [year, month, day] = selectedDate.split('-').map(Number);
  const nextDate = new Date(year, month - 1, day + amount, 12);
  dateInput.value = getLocalDateString(nextDate);
  renderSelectedDate();
}

async function loadDiaries() {
  const response = await fetch('/api/diaries');
  if (!response.ok) {
    throw new Error('일기 목록을 불러오지 못했어요.');
  }

  diaries = await response.json();
  renderSelectedDate();
}

dateInput.addEventListener('change', () => {
  if (!dateInput.value) {
    dateInput.value = selectedDate;
    return;
  }

  renderSelectedDate();
});
previousDayButton.addEventListener('click', () => changeSelectedDate(-1));
nextDayButton.addEventListener('click', () => changeSelectedDate(1));
contentInput.addEventListener('input', updateCharacterCount);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';

  const contentLength = Array.from(contentInput.value).length;
  if (contentLength > 500) {
    formMessage.textContent = '일기는 500자 이내로 작성해 주세요.';
    contentInput.focus();
    return;
  }

  if (isSaving) {
    return;
  }

  isSaving = true;
  saveButton.disabled = true;

  try {
    const response = await fetch('/api/diaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedDate,
        weather: weatherInput.value,
        mood: moodInput.value,
        content: contentInput.value,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '일기를 저장하지 못했어요.');
    }

    diaries = [result, ...diaries].sort((first, second) => second.date.localeCompare(first.date));
    renderSelectedDate();
  } catch (error) {
    formMessage.textContent = error.message || '일기를 저장하지 못했어요.';
  } finally {
    isSaving = false;
    saveButton.disabled = false;
  }
});

dateInput.max = selectedDate;
dateInput.value = selectedDate;
updateCharacterCount();
loadDiaries().catch((error) => {
  formMessage.textContent = error.message;
});
