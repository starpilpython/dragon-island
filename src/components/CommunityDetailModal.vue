<script setup>
import { computed } from 'vue'

const props = defineProps({
  dragon: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'read-story'])

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  } catch (e) {
    return dateStr
  }
}

const formattedDate = computed(() => formatDate(props.dragon.created_at))

const handleClose = () => {
  emit('close')
}

const handleReadStory = () => {
  emit('read-story', props.dragon)
}
</script>

<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <!-- 닫기 버튼 -->
      <button class="close-btn" @click="handleClose">×</button>

      <!-- 드래곤 카드 영역 -->
      <div class="dragon-card">
        <div class="image-frame">
          <img :src="dragon.image_url" class="dragon-img" alt="Dragon" />
          <div class="score-badge">★ {{ dragon.score }}점</div>
        </div>

        <div class="dragon-info">
          <h2 class="dragon-name">{{ dragon.name }}</h2>
          <div class="status-stats">
            <div class="stat-item">
              <span class="stat-label">HP</span>
              <div class="stat-bar-bg">
                <div class="stat-bar-fill hp" :style="{ width: dragon.hp + '%' }"></div>
              </div>
              <span class="stat-value">{{ dragon.hp }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">MP</span>
              <div class="stat-bar-bg">
                <div class="stat-bar-fill mp" :style="{ width: dragon.mp + '%' }"></div>
              </div>
              <span class="stat-value">{{ dragon.mp }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">EXP</span>
              <div class="stat-bar-bg">
                <div class="stat-bar-fill exp" :style="{ width: Math.min((dragon.exp || 0) / 10, 100) + '%' }"></div>
              </div>
              <span class="stat-value">{{ dragon.exp || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 상세 설명 및 날짜 -->
      <div class="detail-section">
        <p class="description">{{ dragon.description }}</p>
        <div class="date-info">만든 날짜: {{ formattedDate }}</div>
      </div>

      <!-- 버튼 영역 -->
      <div class="action-area">
        <button class="story-btn" @click="handleReadStory">
          <div class="btn-icon-box">
             <img src="../assets/s07_icon1.png" class="btn-asset-icon" alt="Story Icon" />
          </div>
          <span class="btn-text">동화 읽기</span>
        </button>

        <!-- [NEW] 소유자인 경우 공유 해제 버튼 표시 -->
        <button v-if="isOwner" class="delete-btn" @click="$emit('unshare', dragon)">
          <div class="btn-icon-box">
             <img src="../assets/s07_icon2.png" class="btn-asset-icon trash" alt="Unshare Icon" />
          </div>
          <span class="btn-text">공유 취소</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  width: 92%;
  max-width: 420px;
  height: auto; /* 내용에 맞춰 조절 */
  max-height: 95vh; /* 최대 높이 소폭 확장 */
  background: white;
  border-radius: 24px;
  padding: 25px; /* 패딩 최적화 */
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
  animation: scale-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes scale-up {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 20px;
  background: none;
  border: none;
  font-size: 2.2rem;
  color: #ccc;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
  z-index: 10;
}

.close-btn:hover {
  color: #888;
}

.dragon-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 5px;
}

.image-frame {
  width: 70%; /* 다시 70%로 조정 */
  aspect-ratio: 1/1;
  background: linear-gradient(135deg, #e1f5fe 0%, #f3e5f5 100%);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  border: 4px solid #fec;
}

.dragon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 10px;
  box-sizing: border-box;
}

.score-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 0.8rem;
  color: #ff9800;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.dragon-info {
  width: 100%;
  margin-top: 15px;
  text-align: center;
}

.dragon-name {
  margin: 0 0 10px 0;
  font-size: 1.5rem;
  color: #4a148c;
  font-weight: 900;
}

.status-stats {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-label {
  font-weight: bold;
  color: #666;
  width: 30px;
  font-size: 0.85rem;
}

.stat-bar-bg {
  flex: 1;
  height: 10px;
  background-color: #eee;
  border-radius: 5px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  transition: width 0.5s ease-out;
}

.stat-bar-fill.hp { background: linear-gradient(90deg, #ff5252, #ff8a80); }
.stat-bar-fill.mp { background: linear-gradient(90deg, #448aff, #40c4ff); }
.stat-bar-fill.exp { background: linear-gradient(90deg, #ffd600, #ffff00); }

.stat-value {
  font-weight: bold;
  color: #444;
  width: 30px;
  font-size: 0.85rem;
}

.detail-section {
  width: 100%;
  margin-top: 15px;
  background: #fff9f0;
  border: 2px dashed #e0d0b0;
  border-radius: 16px;
  padding: 12px 18px;
  text-align: center;
}

.description {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #5d4037;
  word-break: keep-all;
}

.date-info {
  margin-top: 8px;
  font-size: 0.75rem;
  color: #999;
}

.action-area {
  margin-top: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px; /* 버튼 사이 간격 */
}

.story-btn {
  border: 4px solid #ffffff;
  border-radius: 50px;
  padding: 8px 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.2s;
  min-width: 240px;
  background: #80cbc4;
}

.story-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.btn-icon-box {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-asset-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.btn-text {
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 900;
  text-shadow: 0px 1px 3px rgba(0, 0, 0, 0.2);
}
</style>
