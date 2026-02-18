<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import StoryEvaluation from './StoryEvaluation.vue'

const props = defineProps({
  dragon: { type: Object, required: true },
  idToken: { type: String, required: true },
  energy: { type: Number, default: 5 },
  isCommunity: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const stories = ref([])
const isLoading = ref(true)
const selectedStory = ref(null)

// 삭제 컨펌 모달 상태
const showDeleteConfirm = ref(false)
const storyIdToDelete = ref(null)

const fetchStories = async () => {
  isLoading.value = true
  try {
    const url = props.isCommunity 
      ? `${import.meta.env.VITE_API_URL}/api/community/stories/${props.dragon.id}`
      : `${import.meta.env.VITE_API_URL}/api/stories/${props.dragon.id}`
      
    const config = props.isCommunity 
      ? {} 
      : { headers: { 'Authorization': `Bearer ${props.idToken}` } }

    const response = await axios.get(url, config)
    stories.value = response.data
  } catch (error) {
    console.error('동화 목록 로드 실패:', error)
  } finally {
    isLoading.value = false
  }
}

const openStory = (story) => {
  selectedStory.value = story
}

const deleteStory = (storyId, event) => {
  event.stopPropagation()
  storyIdToDelete.value = storyId
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!storyIdToDelete.value) return
  
  try {
    const sid = storyIdToDelete.value
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/stories/${sid}`, {
      data: { idToken: props.idToken, dragon_id: props.dragon.id }
    })
    
    // 사용자 데이터(에너지 등) 정합성을 위해 프로필 다시 불러오기
    await axios.get(`${import.meta.env.VITE_API_URL}/api/user/profile?uid=${props.uid}`).then(res => {
      emit('update-energy', res.data.energy)
    })

    stories.value = stories.value.filter(s => s.id !== sid)
  } catch (error) {
    console.error('삭제 실패:', error)
    alert('삭제 중 오류가 발생했습니다.')
  } finally {
    showDeleteConfirm.value = false
    storyIdToDelete.value = null
  }
}

const getScoreClass = (score) => {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  return 'effort'
}

const getScoreEmoji = (score) => {
  if (score >= 80) return '🌟'
  if (score >= 60) return '✨'
  return '💪'
}

onMounted(fetchStories)
</script>

<template>
  <div class="library-overlay">
    <!-- 배경 이미지 (오버레이 없음) -->
    <img src="../assets/s09.png" class="bg-img" alt="background" />

    <div class="library-container">
      <!-- 상단 바: 헤더 + 에너지 -->
      <div class="top-bar">
        <div class="header-left">
          <button class="back-btn" @click="emit('close')">←</button>
          <div class="header-titles">
            <div class="header-subtitle">동화 모음집</div>
          </div>
        </div>
        <!-- 에너지 바 -->
        <div class="energy-bar">
          <span class="energy-icon">⚡</span>
          <div class="energy-dots">
            <span
              v-for="i in 5" :key="i"
              class="energy-dot"
              :class="{ filled: i <= props.energy }"
            />
          </div>
          <span class="energy-text">{{ props.energy }}/5</span>
        </div>
      </div>

      <!-- 로딩 -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>기록을 불러오는 중...</p>
      </div>

      <!-- 비어있을 때 -->
      <div v-else-if="stories.length === 0" class="empty-state">
        <div class="empty-icon">🏜️</div>
        <p>아직 생성된 동화가 없어요.<br>첫 번째 이야기를 만들어보세요!</p>
      </div>

      <!-- 동화 카드 목록 -->
      <div v-else class="story-list">
        <div
          v-for="story in stories"
          :key="story.id"
          class="story-card"
          @click="openStory(story)"
        >
          <div class="card-top">
            <span class="card-date">📅 {{ story.date || story.id }}</span>
            <span class="score-badge" :class="getScoreClass(story.score)">
              {{ getScoreEmoji(story.score) }} {{ story.score }}점
            </span>
          </div>
          <div class="card-preview">
            {{ story.story ? story.story.substring(0, 80) + '...' : '' }}
          </div>
          <div class="card-bottom">
            <span class="card-read-hint">탭해서 읽기 →</span>
            <button v-if="!isCommunity" class="delete-btn" @click.stop="deleteStory(story.id, $event)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 동화 보기 모달 -->
    <StoryEvaluation
      v-if="selectedStory"
      :evaluation="selectedStory"
      :dragon="dragon"
      :idToken="idToken"
      :is-read-only="true"
      @close="selectedStory = null"
    />

    <!-- 삭제 확인 커스텀 모달 -->
    <div v-if="showDeleteConfirm" class="confirm-overlay">
      <div class="confirm-modal">
        <div class="confirm-icon">🗑️</div>
        <h3 class="confirm-title">동화를 삭제할까요?</h3>
        <p class="confirm-text">삭제된 동화는 다시 복구할 수 없어요.</p>
        <div class="confirm-btns">
          <button class="conf-btn cancel" @click="showDeleteConfirm = false">취소</button>
          <button class="conf-btn delete" @click="confirmDelete">삭제하기</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Jua&display=swap');

.library-overlay {
  position: fixed;
  inset: 0;
  z-index: 2500;
  display: flex;
  flex-direction: column;
}

.bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.library-container {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 420px;
  margin: 0 auto;
  width: 75%;
  padding: 0 16px 24px;
  overflow: hidden;
}

/* 상단 바 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 0 14px;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.85);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  font-size: 1.1rem;
  color: #555;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.2s;
}
.back-btn:hover { background: white; }

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.header-dragon-name {
  font-family: 'Jua', sans-serif;
  font-size: 1.15rem;
  color: #333;
  line-height: 1.2;
}

.header-subtitle {
  font-family: 'Jua', sans-serif;
  font-size: 1.05rem;
  color: #333;
}

/* 에너지 바 */
.energy-bar {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.88);
  padding: 6px 12px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  flex-shrink: 0;
}
.energy-icon { font-size: 0.95rem; }
.energy-dots { display: flex; gap: 3px; align-items: center; }
.energy-dot {
  width: 9px; height: 9px;
  border-radius: 50%;
  background: #ddd;
  transition: background 0.3s;
}
.energy-dot.filled { background: #FFD700; box-shadow: 0 0 4px rgba(255,215,0,0.7); }
.energy-text { font-size: 0.75rem; font-weight: 700; color: #555; }

/* 동화 목록 */
.story-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-bottom: 16px;
}

/* 글라스모피즘 카드 (연한 노란색 틴트) */
.story-card {
  background: rgba(255, 253, 231, 0.3); /* 아주 연한 노란색 */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1.5px solid rgba(255, 249, 196, 0.4);
  border-radius: 20px;
  padding: 16px 18px;
  cursor: pointer;
  transition: all 0.22s;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.story-card:hover {
  background: rgba(255, 255, 255, 0.28);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-date {
  font-family: 'Jua', sans-serif;
  font-size: 0.78rem;
  color: #888;
}

.score-badge {
  font-family: 'Jua', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 20px;
  white-space: nowrap;
}
.score-badge.excellent { background: rgba(76,175,80,0.15); color: #2e7d32; border: 1px solid rgba(76,175,80,0.3); }
.score-badge.good      { background: rgba(255,152,0,0.15); color: #ef6c00; border: 1px solid rgba(255,152,0,0.3); }
.score-badge.effort    { background: rgba(244,67,54,0.15); color: #c62828; border: 1px solid rgba(244,67,54,0.3); }

.card-preview {
  font-family: 'Jua', sans-serif;
  font-size: 0.92rem;
  color: #444;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-read-hint {
  font-family: 'Jua', sans-serif;
  font-size: 0.78rem;
  color: #aaa;
}

.delete-btn {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.delete-btn:hover {
  background: rgba(244,67,54,0.35);
  border-color: rgba(244,67,54,0.5);
}

/* 로딩 / 비어있음 */
.loading-state, .empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.85);
  text-align: center;
  font-family: 'Jua', sans-serif;
  gap: 16px;
}

.empty-icon { font-size: 4rem; }

.spinner {
  width: 40px; height: 40px;
  border: 4px solid rgba(255,255,255,0.2);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* 삭제 확인 모달 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.confirm-modal {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 320px;
  padding: 30px 24px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.confirm-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.confirm-title {
  font-family: 'Jua', sans-serif;
  font-size: 1.4rem;
  color: #333;
  margin: 0 0 8px;
}

.confirm-text {
  font-family: 'Jua', sans-serif;
  font-size: 0.95rem;
  color: #777;
  margin: 0 0 24px;
  line-height: 1.5;
}

.confirm-btns {
  display: flex;
  gap: 12px;
}

.conf-btn {
  flex: 1;
  height: 48px;
  border-radius: 14px;
  border: none;
  font-family: 'Jua', sans-serif;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.conf-btn.cancel {
  background: #f0f0f0;
  color: #666;
}
.conf-btn.cancel:hover { background: #e5e5e5; }

.conf-btn.delete {
  background: #ff5252;
  color: white;
  box-shadow: 0 4px 12px rgba(255,82,82,0.3);
}
.conf-btn.delete:hover { 
  background: #ff3d3d;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255,82,82,0.4);
}
</style>
