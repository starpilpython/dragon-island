<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import s01bg from '../assets/s01.png'
import s10bg from '../assets/s10.png'

const props = defineProps({
  idToken: String
})

const emit = defineEmits(['banner-open', 'banner-close'])

const dragons = ref([])
const selectedDragon = ref(null)
const reports = ref([])
const isLoading = ref(false)
const isLoadingReports = ref(false)
const showReportBanner = ref(false)
const selectedReport = ref(null)

// 드래곤 목록 가져오기
const fetchDragons = async () => {
  if (!props.idToken) return
  isLoading.value = true
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dragons`, {
      headers: { 'Authorization': `Bearer ${props.idToken}` }
    })
    dragons.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('드래곤 목록 로드 실패:', error)
  } finally {
    isLoading.value = false
  }
}

// 특정 드래곤의 리포트 가져오기
const fetchReports = async (dragonId) => {
  isLoadingReports.value = true
  reports.value = []
  try {
    const listUrl = `${import.meta.env.VITE_API_URL}/api/reports/${dragonId}`
    console.log('Fetching reports from:', listUrl)
    
    // axios.get으로 직접 호출 (헤더에 토큰 포함)
    const response = await axios.get(listUrl, {
      headers: { 'Authorization': `Bearer ${props.idToken}` }
    })
    reports.value = response.data
  } catch (error) {
    console.error('리포트 로드 실패:', error)
  } finally {
    isLoadingReports.value = false
  }
}

const selectDragon = (dragon) => {
  selectedDragon.value = dragon
  showReportBanner.value = false
  selectedReport.value = null
  fetchReports(dragon.id)
}

const openReportBanner = (report) => {
  selectedReport.value = report
  showReportBanner.value = true
  emit('banner-open')
}

const isDeleteModalOpen = ref(false)
const reportToDeleteId = ref(null)

// 삭제 버튼 클릭 시 모달 열기
const deleteReport = (reportId) => {
  reportToDeleteId.value = reportId
  isDeleteModalOpen.value = true
}

// 모달에서 확인 클릭 시 실제 삭제 수행
const confirmDelete = async () => {
  if (!reportToDeleteId.value) return
  
  try {
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/reports/${reportToDeleteId.value}?idToken=${props.idToken}`)
    // alert('리포트가 삭제되었습니다.') // 모달 UX에서는 alert 생략 가능
    
    // 상태 초기화 및 닫기
    showReportBanner.value = false
    selectedReport.value = null
    isDeleteModalOpen.value = false
    reportToDeleteId.value = null
    
    if (selectedDragon.value) {
      fetchReports(selectedDragon.value.id)
    }
    emit('banner-close')
  } catch (error) {
    console.error('리포트 삭제 실패:', error)
    alert('삭제에 실패했습니다.')
  }
}

const closeDeleteModal = () => {
  isDeleteModalOpen.value = false
  reportToDeleteId.value = null
}

const closeBanner = () => {
  showReportBanner.value = false
  selectedReport.value = null
  emit('banner-close')
}

onMounted(() => {
  fetchDragons()
})

watch(() => props.idToken, (newToken) => {
  if (newToken) fetchDragons()
})

const getScoreColor = (score, max) => {
  const percent = (score / max) * 100
  if (percent >= 80) return '#4caf50'
  if (percent >= 55) return '#ffbc00'
  return '#ff5252'
}

const criteria = [
  { key: 'specificity', label: '구체성', max: 30 },
  { key: 'clarity', label: '명확성', max: 20 },
  { key: 'safety', label: '안전성', max: 20 },
  { key: 'logic', label: '논리성', max: 15 },
  { key: 'creativity', label: '창의성', max: 15 },
]

// 가장 높은 항목과 낮은 항목 찾기
const getStrengths = (scores) => {
  return criteria
    .map(c => ({ ...c, score: scores[c.key], pct: (scores[c.key] / c.max) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2)
}

const getWeaknesses = (scores) => {
  const strengths = getStrengths(scores)
  const strengthKeys = new Set(strengths.map(s => s.key))
  return criteria
    .map(c => ({ ...c, score: scores[c.key], pct: (scores[c.key] / c.max) * 100 }))
    .sort((a, b) => a.pct - b.pct)
    .filter(w => !strengthKeys.has(w.key))
    .slice(0, 2)
}
</script>

<template>
  <div class="report-view">
    <div class="page-header">
      <img :src="s10bg" class="header-banner-img" />
    </div>

    <div class="report-layout">
      <!-- 왼쪽: 드래곤 선택 리스트 -->
      <div class="dragon-sidebar">
        <div
          v-for="dragon in dragons"
          :key="dragon.id"
          class="dragon-item"
          :class="{ active: selectedDragon?.id === dragon.id }"
          @click="selectDragon(dragon)"
        >
          <img :src="dragon.image_url" class="dragon-mini-thumb" />
          <span>{{ dragon.name }}</span>
        </div>
        <div v-if="dragons.length === 0 && !isLoading" class="no-dragons">
          아직 드래곤이 없어요.
        </div>
      </div>

      <!-- 오른쪽: 리포트 영역 -->
      <div class="report-main">
        <!-- 드래곤 미선택 -->
        <div v-if="!selectedDragon" class="select-hint">
          왼쪽에서 드래곤을 선택해 보세요! 🐲
        </div>

        <!-- 드래곤 선택됨 -->
        <template v-else>
          <!-- 드래곤 헤더 (이미지 없이 이름만) -->
          <div class="dragon-header">
            <h2 class="dragon-name-title">{{ selectedDragon.name }}</h2>
            <p class="dragon-sub"></p>
          </div>

          <!-- 로딩 -->
          <div v-if="isLoadingReports" class="loading-reports">분석 결과를 불러오는 중...</div>

          <!-- 리포트 없음 -->
          <div v-else-if="reports.length === 0" class="no-reports">
            아직 이 드래곤에 대한 평가 기록이 없어요.<br>
            이야기를 들려주면 분석해 드릴게요!
          </div>

          <!-- 리포트 목록 -->
          <div v-else class="reports-scroll">
            <div
              v-for="report in reports"
              :key="report.id"
              class="report-card"
            >
              <p class="report-prompt">"​{{ report.prompt }}"​</p>
              <div class="report-card-bottom">
                <div class="total-circle" :class="{ pass: report.is_pass }">
                  {{ report.total_score }}
                </div>
                <button class="detail-btn" @click="openReportBanner(report)">❗상세</button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 상세 보고서 배너 (풀스크린 오버레이) -->
    <Transition name="fade">
      <div
        v-if="showReportBanner && selectedReport"
        class="report-banner-overlay"
        :style="{ backgroundImage: `url(${s01bg})` }"
      >
        <!-- 닫기 버튼 -->
        <button class="close-banner-btn" @click="closeBanner">✕</button>

        <!-- [NEW] 삭제 버튼 -->
        <button class="delete-report-btn" @click="deleteReport(selectedReport.id)">삭제</button>

        <!-- 스크롤 가능한 내용 영역 -->
        <div class="banner-scroll-area">

          <!-- 헤더 -->
          <div class="banner-header-box">
            <h3 class="banner-title">📊 상세 분석 보고서</h3>
            <p class="banner-prompt">"{{ selectedReport.prompt }}"</p>
          </div>

          <!-- 총점 + 잘한점/개선할점 나란히 -->
          <div class="banner-top-row">
            <div class="banner-total-circle" :class="{ pass: selectedReport.is_pass }">
              <span class="banner-total-val">{{ selectedReport.total_score }}</span>
              <span class="banner-total-unit">점</span>
            </div>
            <div class="banner-insight-row">
              <div class="insight-box strength">
                <div class="insight-title">💪 잘한 점</div>
                <div v-for="s in getStrengths(selectedReport.scores)" :key="s.key" class="insight-item">
                  {{ s.label }}
                </div>
              </div>
              <div class="insight-box improve">
                <div class="insight-title">🌱 개선할 점</div>
                <div v-for="w in getWeaknesses(selectedReport.scores)" :key="w.key" class="insight-item">
                  {{ w.label }}
                </div>
              </div>
            </div>
          </div>

          <!-- 항목별 점수 그래프 -->
          <div class="banner-card">
            <div class="banner-card-title">항목별 점수</div>
            <div class="banner-scores">
              <div v-for="c in criteria" :key="c.key" class="banner-score-row">
                <span class="banner-score-label">{{ c.label }}</span>
                <div class="banner-progress-bar">
                  <div
                    class="banner-progress-fill"
                    :style="{
                      width: (selectedReport.scores[c.key] / c.max * 100) + '%',
                      backgroundColor: getScoreColor(selectedReport.scores[c.key], c.max)
                    }"
                  ></div>
                </div>
                <span class="banner-score-val">{{ selectedReport.scores[c.key] }}/{{ c.max }}</span>
              </div>
            </div>
          </div>

          <!-- AI 피드백 -->
          <div class="banner-card banner-feedback">
            <div class="feedback-judge">👩‍🏫</div>
            <p class="feedback-text">{{ selectedReport.feedback }}</p>
          </div>

        </div>
      </div>
    </Transition>

    <!-- [NEW] 삭제 확인 모달 -->
    <div v-if="isDeleteModalOpen" class="modal-overlay" @click.self="closeDeleteModal">
      <div class="modal-content confirm">
        <h3 class="modal-title">리포트 삭제</h3>
        <p class="modal-message">
          정말 이 리포트를 삭제하시겠습니까?<br>
          <span class="sub-msg">삭제된 내용은 복구할 수 없습니다.</span>
        </p>
        <div class="modal-buttons">
          <button class="modal-btn cancel" @click="closeDeleteModal">취소</button>
          <button class="modal-btn delete" @click="confirmDelete">삭제</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-view {
  position: relative;
  width: 100%;
  height: calc(100% - 90px);
  padding: 40px 20px 20px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 16px;
}

.header-banner-img {
  width: 100%;
  border-radius: 16px;
  display: block;
  object-fit: cover;
}

.report-layout {
  display: flex;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}

/* 사이드바 */
.dragon-sidebar {
  width: 90px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.dragon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 10px 6px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  transition: all 0.2s;
  border: 2px solid transparent;
}

.dragon-item:hover {
  background: white;
  transform: scale(1.04);
}

.dragon-item.active {
  background: white;
  border-color: #a5c3f6;
  box-shadow: 0 4px 12px rgba(165, 195, 246, 0.3);
}

.dragon-mini-thumb {
  width: 55px;
  height: 55px;
  object-fit: cover;
  border-radius: 50%;
  background: #eee;
}

.dragon-item span {
  font-size: 0.75rem;
  font-weight: bold;
  color: #555;
  text-align: center;
}

/* 메인 영역 - 흰색 배경 컨테이너 */
.report-main {
  flex: 1;
  background: white;
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.07);
  overflow: hidden;
}

.dragon-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1.5px solid #f0f0f0;
}

.dragon-big-thumb {
  width: 70px;
  height: 70px;
  object-fit: cover;
  border-radius: 18px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.dragon-name-title {
  font-family: 'Jua', sans-serif;
  font-size: 1.3rem;
  margin: 0 0 4px;
  color: #333;
}

.dragon-sub {
  font-size: 0.8rem;
  color: #aaa;
  margin: 0;
}

/* 리포트 카드 목록 */
.reports-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f9fbfd;
  border-radius: 16px;
  padding: 12px 14px;
  transition: all 0.2s;
  border: 1.5px solid #eef2f7;
}

.report-card:hover {
  background: #eef4ff;
  border-color: #a5c3f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(165, 195, 246, 0.2);
}

.total-circle {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ff5252;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Jua', sans-serif;
  font-size: 1rem;
  font-weight: bold;
  box-shadow: 0 3px 8px rgba(255, 82, 82, 0.3);
}

.total-circle.pass {
  background: #4caf50;
  box-shadow: 0 3px 8px rgba(76, 175, 80, 0.3);
}

.report-prompt {
  font-size: 0.85rem;
  color: #444;
  margin: 0;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-card-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(135deg, #a5c3f6, #7da0ff);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(125, 160, 255, 0.3);
}

.detail-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(125, 160, 255, 0.4);
}

.detail-btn:active {
  transform: scale(0.97);
}

.report-card-arrow {
  font-size: 1.4rem;
  color: #ccc;
  flex-shrink: 0;
}

/* 배너 오버레이 - 풀스크린 */
.report-banner-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.close-banner-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 110;
  background: rgba(255,255,255,0.9);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1rem;
  cursor: pointer;
  color: #555;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: all 0.2s;
}

.close-banner-btn:hover {
  background: rgba(0,0,0,0.6);
  transform: scale(1.1);
}

.delete-report-btn {
  position: fixed; /* Changed from absolute to fixed to match close button behavior */
  top: 16px; /* Align with close button */
  right: 60px; /* Adjust position relative to close button */
  background: rgba(255, 100, 100, 0.9);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  z-index: 110; /* Ensure it's above other content */
  transition: all 0.2s;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.delete-report-btn:hover {
  background: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(255, 82, 82, 0.3);
}

/* 스크롤 영역 */
.banner-scroll-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 56px 16px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 헤더 카드 */
.banner-header-box {
  background: rgba(255,255,255,0.92);
  border-radius: 20px;
  padding: 18px 18px 14px;
  backdrop-filter: blur(6px);
}

.banner-title {
  font-family: 'Jua', sans-serif;
  font-size: 1.2rem;
  margin: 0 0 8px;
  color: #333;
}

.banner-prompt {
  font-style: italic;
  color: #555;
  font-size: 0.88rem;
  margin: 0;
  line-height: 1.5;
}

/* 총점 + 잘한점/개선할점 행 */
.banner-top-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.banner-total-circle {
  flex-shrink: 0;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: #ff5252;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(255, 82, 82, 0.4);
}

.banner-total-circle.pass {
  background: #4caf50;
  box-shadow: 0 4px 14px rgba(76, 175, 80, 0.4);
}

.banner-total-val {
  font-family: 'Jua', sans-serif;
  font-size: 1.7rem;
  line-height: 1;
}

.banner-total-unit {
  font-size: 0.68rem;
  font-weight: bold;
}

/* 항목별 점수 그래프 */
.banner-scores {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.banner-score-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.banner-score-label {
  flex: 0 0 55px;
  font-size: 0.82rem;
  font-weight: bold;
  color: #666;
}

.banner-progress-bar {
  flex: 1;
  height: 10px;
  background: #eee;
  border-radius: 5px;
  overflow: hidden;
}

.banner-progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 1s ease-out;
}

.banner-score-val {
  font-size: 0.9rem;
  font-weight: bold;
  color: #555;
  width: 45px;
  text-align: right;
}

/* 잘한점/개선할점 행 */
.banner-insight-row {
  display: flex;
  flex: 1;
  gap: 8px;
}

.insight-box {
  flex: 1;
  border-radius: 14px;
  padding: 10px 12px;
}

/* AI 피드백 */
.banner-feedback {
  flex-direction: row;
  align-items: flex-start;
  gap: 15px;
  background: #e8f5e9; /* 연한 초록 배경 */
  border: 1px solid #c8e6c9;
}

.feedback-judge {
  font-size: 2rem;
}

.feedback-text {
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #2e7d32;
  word-break: keep-all;
}

/* [NEW] 모달 스타일 (공통 사용 가능하게 추출하면 좋음) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh; /* 전체 화면 덮기 */
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* 최상위 */
  backdrop-filter: blur(5px);
}

.modal-content.confirm {
  background: white;
  padding: 30px;
  border-radius: 20px;
  width: 90%;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.modal-title {
  margin: 0 0 15px;
  font-size: 1.2rem;
  color: #333;
}

.modal-message {
  font-size: 1rem;
  color: #666;
  margin-bottom: 25px;
  line-height: 1.5;
}

.sub-msg {
  font-size: 0.85rem;
  color: #e57373;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.modal-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn.cancel {
  background: #f5f5f5;
  color: #777;
}

.modal-btn.delete {
  background: #ff5252;
  color: white;
}

.modal-btn:active {
  transform: scale(0.95);
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.insight-box.strength {
  background: rgba(232, 245, 233, 0.95);
}

.insight-box.improve {
  background: rgba(255, 243, 224, 0.95);
}

.insight-title {
  font-weight: bold;
  font-size: 0.8rem;
  margin-bottom: 6px;
  color: #444;
}

.insight-item {
  font-size: 0.8rem;
  color: #555;
  margin-bottom: 3px;
}

/* 흰색 카드 공통 */
.banner-card {
  background: rgba(255,255,255,0.92);
  border-radius: 20px;
  padding: 16px 18px;
  backdrop-filter: blur(6px);
}

.banner-card-title {
  font-family: 'Jua', sans-serif;
  font-size: 0.95rem;
  color: #555;
  margin-bottom: 12px;
}

/* AI 피드백 */
.banner-feedback {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.feedback-judge {
  font-size: 1.6rem;
  flex-shrink: 0;
}

.feedback-text {
  font-family: 'Jua', sans-serif;
  font-size: 0.9rem;
  color: #444;
  line-height: 1.5;
  margin: 0;
}

/* 공통 상태 */
.select-hint, .no-reports, .loading-reports, .no-dragons {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #bbb;
  font-family: 'Jua', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
}

/* 페이드 애니메이션 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
