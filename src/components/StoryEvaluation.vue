<script setup>
import { ref, computed } from 'vue'
import { auth } from '../firebase'
import axios from 'axios'

const props = defineProps({
  evaluation: { type: Object, required: true },
  dragon: { type: Object, required: true },
  idToken: { type: String, default: '' },
  isReadOnly: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'saved'])

const isSaving = ref(false)
const isSaved = ref(false)
const fontSize = ref(1.1) // 기본 폰트 사이즈 (rem)

const increaseFont = () => {
  if (fontSize.value < 2.0) fontSize.value += 0.1
}

const decreaseFont = () => {
  if (fontSize.value > 0.8) fontSize.value -= 0.1
}


// 스토리 텍스트를 문단으로 분리
const storyParagraphs = computed(() => {
  const story = props.evaluation.story || ''
  return story.split('\n').filter(p => p.trim().length > 0)
})

const scoreColor = computed(() => {
  const s = props.evaluation.score
  if (s >= 80) return '#4caf50'
  if (s >= 60) return '#ff9800'
  return '#f44336'
})

const scoreEmoji = computed(() => {
  const s = props.evaluation.score
  if (s >= 80) return '🌟'
  if (s >= 60) return '✨'
  return '💪'
})

const dragonImage = computed(() => {
  return props.dragon?.image_url || new URL('../assets/s07_icon1.png', import.meta.url).href
})

// Firebase에 동화 저장
const saveStoryToFirebase = async () => {
  if (isSaved.value || isSaving.value) return
  isSaving.value = true
  try {
    const user = auth.currentUser
    if (!user) return

    const freshToken = await user.getIdToken(true)
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    await axios.post(`${import.meta.env.VITE_API_URL}/api/story/save`, {
      idToken: freshToken,
      date: today,
      dragon_id: props.dragon?.id || '',
      dragon_name: props.dragon?.name || '',
      story: props.evaluation.story || '',
      score: props.evaluation.score || 0,
      feedback: props.evaluation.explanation || '',
      earned_xp: props.evaluation.earned_xp || 0
    })
    isSaved.value = true
  } catch (e) {
    console.error('동화 저장 실패:', e)
    // 저장 실패해도 닫기는 허용
    isSaved.value = true
  } finally {
    isSaving.value = false
  }
}

const handleConfirm = async () => {
  if (!props.isReadOnly) {
    await saveStoryToFirebase()
    emit('saved') // 저장 완료 시에만 이벤트 발생
  }
  emit('close')
}

const goToPage = (page) => {
  currentPage.value = page
}
</script>

<template>
  <div class="book-overlay" @click.self="handleConfirm">
    <div class="book-container">

      <!-- 헤더 -->
      <div class="book-header">
        <button class="back-btn" @click="handleConfirm">←</button>
        <h2 class="book-title">동화 읽기</h2>
        <img src="../assets/s07_icon1.png" class="header-dragon-icon" alt="dragon" />
      </div>

      <!-- 드래곤 이름 (텍스트만 남김) -->
      <div class="dragon-title-row">
        <span class="dragon-title-name">{{ dragon.name }} <span class="legend-tag">(전설)</span></span>
      </div>

      <!-- 페이지 콘텐츠 -->
      <div class="book-pages">

        <!-- 동화 스토리 -->
        <div class="page story-page">
          <div class="story-card">
            <!-- 뉴스 칼럼 스타일: 이미지가 float되어 글이 감싸는 구조 -->
            <div class="story-text-area" :style="{ fontSize: fontSize + 'rem' }">
              <img :src="dragonImage" class="story-dragon-img" alt="dragon" />
              <p v-for="(para, i) in storyParagraphs" :key="i" class="story-para">
                {{ para }}
              </p>
            </div>
            <!-- 읽기 컨트롤 (글자 크기만 남김) -->
            <div class="story-controls">
              <button class="ctrl-btn font-btn" @click="increaseFont">가+</button>
              <button class="ctrl-btn font-btn" @click="decreaseFont">가-</button>
            </div>
          </div>
        </div>

      </div>

      <!-- 하단 버튼 -->
      <div class="book-footer">
        <button
          class="finish-btn"
          @click="handleConfirm"
          :disabled="isSaving"
        >
          <span class="finish-btn-inner">
            <span class="finish-icon">{{ isSaving ? '⏳' : '🌟' }}</span>
            <span class="finish-text">{{ isSaving ? '저장 중...' : '끝까지 읽었어!' }}</span>
          </span>
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=Jua&display=swap');

.book-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
}

.book-container {
  width: 100%;
  max-width: 420px;
  max-height: 92vh;
  background: linear-gradient(160deg, #fef9ff 0%, #f0f4ff 100%);
  border-radius: 32px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: bookOpen 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes bookOpen {
  from { transform: scale(0.85) translateY(30px); opacity: 0; }
  to   { transform: scale(1) translateY(0); opacity: 1; }
}

/* 헤더 */
.book-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 10px;
  background: rgba(255,255,255,0.7);
}

.back-btn {
  background: rgba(255,255,255,0.9);
  border: none;
  border-radius: 50%;
  width: 36px; height: 36px;
  font-size: 1.1rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.book-title {
  font-family: 'Jua', sans-serif;
  font-size: 1.2rem;
  color: #444;
  margin: 0;
}

.header-dragon-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
}

/* 드래곤 타이틀 */
.dragon-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 20px 10px;
}

.dragon-badge {
  width: 32px; height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
}

.dragon-title-name {
  font-family: 'Jua', sans-serif;
  font-size: 1.05rem;
  color: #555;
}

.legend-tag {
  font-size: 0.85rem;
  color: #aaa;
}

.sparkle {
  color: #ffd700;
  font-size: 1rem;
}

/* 페이지 영역 */
.book-pages {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

/* 스토리 페이지 */
.story-card {
  background: white;
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  border: 1.5px solid #f0e6ff;
}

.story-text-area {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #333;
  text-align: left;
}

.story-dragon-img {
  float: left;
  width: 110px;
  height: 110px;
  object-fit: contain;
  margin: 0 16px 10px 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #fce4ec, #e3f2fd);
  border: 2px solid #f8bbd0;
  shape-outside: margin-box;
}

.story-para {
  font-family: 'Jua', sans-serif;
  line-height: 1.75;
  color: #444;
  margin: 0 0 10px 0;
  /* font-size는 부모의 :style 바인딩에서 제어됨 */
}

.story-controls {
  display: flex;
  gap: 10px;
  justify-content: flex-end; /* 오른쪽 정렬 */
  margin-top: 10px;
}

.ctrl-btn {
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.15s;
}

.ctrl-btn:active { transform: scale(0.95); }

.font-btn {
  background: #f0f0f0;
  padding: 8px 0;
  text-align: center;
}

/* 하단 버튼 */
.book-footer {
  padding: 12px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.finish-btn {
  width: 100%;
  padding: 0;
  background: linear-gradient(135deg, #FFB347, #FF6B9D, #C44DFF);
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 1.15rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(255, 107, 157, 0.45), 0 2px 0 rgba(0,0,0,0.1);
  transition: all 0.2s;
  font-family: 'Jua', sans-serif;
  position: relative;
  overflow: hidden;
}

.finish-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%);
  border-radius: inherit;
}

.finish-btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 20px;
  position: relative;
  z-index: 1;
}

.finish-icon {
  font-size: 1.5rem;
  animation: starPop 1.2s ease-in-out infinite;
}

.finish-text {
  font-size: 1.15rem;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

@keyframes starPop {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.3) rotate(15deg); }
}

.finish-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(255, 107, 157, 0.55);
}

.finish-btn:active:not(:disabled) { transform: scale(0.97) translateY(0); }
.finish-btn:disabled { opacity: 0.7; cursor: not-allowed; }


</style>
