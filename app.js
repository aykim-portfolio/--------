

let radarChartInstance = null;
let stackedBarChartInstance = null;
let monthlyLineChartInstance = null;
let kepcoDataLoaded = false; // 한전 빅데이터 연동 여부

Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Pretendard', sans-serif";

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initFitAnalyzer();
    initCostPredictor();
    initKmaApiSync();
    initKepcoApiSync();
});

// --- Tab Navigation Logic ---
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// --- 1. Fit Analyzer Logic ---
function initFitAnalyzer() {
    const btnDiagnose = document.getElementById('btn-diagnose');
    
    btnDiagnose.addEventListener('click', () => {
        const prefTemp = parseFloat(document.getElementById('pref-temp').value);
        const prefHumidity = parseFloat(document.getElementById('pref-humidity').value);
        const prefWind = parseFloat(document.getElementById('pref-wind').value);

        let bestMatch = null;
        let worstMatch = null;
        let minScore = Infinity;
        let maxScore = -Infinity;

        for (const [key, data] of Object.entries(regionData)) {
            const tempDiff = Math.abs(data.temp - prefTemp) * 2;
            const humDiff = Math.abs(data.humidity - prefHumidity) * 0.5;
            const windDiff = Math.abs(data.wind - prefWind) * 3;

            const totalScore = tempDiff + humDiff + windDiff;

            if (totalScore < minScore) {
                minScore = totalScore;
                bestMatch = { key, data };
            }
            if (totalScore > maxScore) {
                maxScore = totalScore;
                worstMatch = { key, data };
            }
        }

        // 일치율 계산 (점수가 낮을수록 100%에 가까움, 임의의 스케일 사용)
        const matchPercentage = Math.max(0, 100 - (minScore * 2)).toFixed(0);

        // 라이프스타일 꿀팁
        const tips = {
            "Seoul": "도심의 편리함과 무난한 기후! 미세먼지 대비 공기청정기와 창틀 단열에 신경쓰세요.",
            "Busan": "바닷바람이 잦아 환기가 잘 됩니다. 겨울철 결로 대비 단열 시공이 꼼꼼한 집이 좋습니다.",
            "Jeju": "습도와 강풍에 대비해 튼튼한 이중창과 강력한 제습기가 필수입니다!",
            "Gangneung": "겨울철 눈이 많이 옵니다. 언덕이 적고 난방 효율이 좋은 구조인지 꼭 확인하세요.",
            "Chuncheon": "일교차와 연교차가 매우 큽니다. 여름철 에어컨과 겨울철 난방 시스템의 성능이 가장 중요합니다.",
            "Gwangju": "여름철 더위와 습도에 대비해 통풍이 잘 되는 남향/남동향 위주로 알아보세요."
        };

        document.getElementById('fit-result-empty').classList.add('hidden');
        document.getElementById('fit-result-content').classList.remove('hidden');
        
        document.getElementById('best-match-city').textContent = bestMatch.data.name;
        document.getElementById('match-percentage').textContent = matchPercentage + '%';
        document.getElementById('worst-match-city').textContent = worstMatch.data.name;
        document.getElementById('match-description').textContent = bestMatch.data.description;
        document.getElementById('lifestyle-tip').textContent = tips[bestMatch.key];

        // 진단 결과를 비교 지역 2에 자동 세팅
        const selectRegion2 = document.getElementById('select-region2');
        if (selectRegion2 && bestMatch) {
            selectRegion2.value = bestMatch.key;
            document.getElementById('lbl-region2-fit').style.display = 'inline-block';
        }

        drawRadarChart(prefTemp, prefHumidity, prefWind, bestMatch.data);
    });
}

function drawRadarChart(pTemp, pHumidity, pWind, region) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (radarChartInstance) radarChartInstance.destroy();
    
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['기온', '습도', '바람'],
            datasets: [
                {
                    label: '나의 취향',
                    data: [pTemp * 5, pHumidity, pWind * 15],
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2
                },
                {
                    label: `${region.name} 평균`,
                    data: [region.temp * 5, region.humidity, region.wind * 15],
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            scales: { r: { angleLines: { color: 'rgba(255,255,255,0.1)' }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#f8fafc' }, ticks: { display: false } } },
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// --- 2. Advanced Cost Predictor Logic ---
function initCostPredictor() {
    const btnCalculate = document.getElementById('btn-calculate');
    const selectRegion2 = document.getElementById('select-region2');

    // 사용자가 비교 지역 2를 수동으로 변경하면 (나의 날씨 체질) 텍스트 숨김
    if (selectRegion2) {
        selectRegion2.addEventListener('change', () => {
            const lbl = document.getElementById('lbl-region2-fit');
            if (lbl) lbl.style.display = 'none';
        });
    }

    btnCalculate.addEventListener('click', () => {
        const area = parseFloat(document.getElementById('input-area').value);
        const insulationKey = document.getElementById('select-insulation').value;
        const houseTypeKey = document.getElementById('select-house').value;
        const heatingKey = document.getElementById('select-heating').value;
        
        const r1Key = document.getElementById('select-region1').value;
        const r2Key = document.getElementById('select-region2').value;

        if (r1Key === r2Key) {
            alert('서로 다른 두 지역을 선택해주세요.');
            return;
        }

        const cost1 = simulateCost(r1Key, area, insulationKey, houseTypeKey, heatingKey);
        const cost2 = simulateCost(r2Key, area, insulationKey, houseTypeKey, heatingKey);

        displayCostResult(cost1, cost2);
    });
}

function simulateCost(regionKey, area, insulationKey, houseTypeKey, heatingKey) {
    const r = regionData[regionKey];
    const insulationFactor = insulationGrades[insulationKey].factor;
    const houseFactor = houseTypeFactors[houseTypeKey].factor;
    const heatingUnitPrice = heatingMethods[heatingKey].costPerHddUnit;
    const coolingUnitPrice = coolingMethod.costPerCddUnit;
    
    // 환경 인자 (면적, 단열, 주거형태 종합)
    const multiplier = (area / 10) * insulationFactor * houseFactor;

    const monthlyCost = [];
    let yearlyHeat = 0;
    let yearlyCool = 0;

    for (let i = 0; i < 12; i++) {
        const heat = r.monthlyHdd[i] * multiplier * heatingUnitPrice;
        const cool = r.monthlyCdd[i] * multiplier * coolingUnitPrice;
        monthlyCost.push(heat + cool);
        yearlyHeat += heat;
        yearlyCool += cool;
    }

    return { 
        regionKey: regionKey,
        regionName: r.name, 
        monthlyCost, 
        yearlyHeat, 
        yearlyCool, 
        yearlyTotal: yearlyHeat + yearlyCool 
    };
}

function displayCostResult(cost1, cost2) {
    document.getElementById('cost-result-empty').classList.add('hidden');
    document.getElementById('cost-result-content').classList.remove('hidden');

    // 10년 누적 차이 계산
    const diffYearly = Math.abs(cost1.yearlyTotal - cost2.yearlyTotal);
    const diff10Years = diffYearly * 10;
    const diffFormatted = new Intl.NumberFormat('ko-KR').format(Math.round(diff10Years));
    
    let text = "";
    if (cost1.yearlyTotal < cost2.yearlyTotal) {
        text = `${cost1.regionName} 거주 시 10년간 약 ${diffFormatted}원 이득!`;
    } else {
        text = `${cost2.regionName} 거주 시 10년간 약 ${diffFormatted}원 이득!`;
    }
    
    document.getElementById('ten-year-diff-text').textContent = text;

    drawStackedBarChart(cost1, cost2);
    drawMonthlyLineChart(cost1, cost2);
}

// 냉난방 분리 누적 막대 차트
function drawStackedBarChart(cost1, cost2) {
    const ctx = document.getElementById('stackedBarChart').getContext('2d');
    if (stackedBarChartInstance) stackedBarChartInstance.destroy();

    stackedBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [cost1.regionName, cost2.regionName],
            datasets: [
                {
                    label: '난방비 (겨울)',
                    data: [cost1.yearlyHeat, cost2.yearlyHeat],
                    backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red
                },
                {
                    label: '냉방비 (여름)',
                    data: [cost1.yearlyCool, cost2.yearlyCool],
                    backgroundColor: 'rgba(59, 130, 246, 0.7)', // Blue
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => new Intl.NumberFormat('ko-KR').format(v/10000) + '만' } }
            },
            plugins: {
                tooltip: { callbacks: { label: c => c.dataset.label + ': ' + new Intl.NumberFormat('ko-KR').format(c.parsed.y) + '원' } }
            }
        }
    });
}

// 월별 지출 패턴 라인 차트
function drawMonthlyLineChart(cost1, cost2) {
    const ctx = document.getElementById('monthlyLineChart').getContext('2d');
    if (monthlyLineChartInstance) monthlyLineChartInstance.destroy();

    const labels = Array.from({length: 12}, (_, i) => `${i+1}월`);

    const datasets = [
        {
            label: cost1.regionName + " 시뮬레이션",
            data: cost1.monthlyCost,
            borderColor: 'rgba(139, 92, 246, 1)', // Purple
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2, tension: 0.3, fill: true
        },
        {
            label: cost2.regionName + " 시뮬레이션",
            data: cost2.monthlyCost,
            borderColor: 'rgba(59, 130, 246, 1)', // Blue
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2, tension: 0.3, fill: true
        }
    ];

    if (kepcoDataLoaded) {
        // 지역별 실제 한전 평균 요금을 매핑
        const metroMap = { 'Seoul': '11', 'Busan': '26', 'Gwangju': '29', 'Jeju': '50', 'Gangneung': '32', 'Chuncheon': '32' };
        
        const baseBill1 = kepcoDataLoaded[metroMap[cost1.regionKey]] || 21000;
        const baseBill2 = kepcoDataLoaded[metroMap[cost2.regionKey]] || 21000;

        const kepcoPattern1 = [
            baseBill1*2.5, baseBill1*2.2, baseBill1*1.8, baseBill1*1.2, baseBill1*1.0, 
            baseBill1*1.5, baseBill1*3.5, baseBill1*4.5, baseBill1*2.0, baseBill1*1.1, 
            baseBill1*1.0, baseBill1*2.0
        ];
        
        const kepcoPattern2 = [
            baseBill2*2.5, baseBill2*2.2, baseBill2*1.8, baseBill2*1.2, baseBill2*1.0, 
            baseBill2*1.5, baseBill2*3.5, baseBill2*4.5, baseBill2*2.0, baseBill2*1.1, 
            baseBill2*1.0, baseBill2*2.0
        ];

        datasets.push({
            label: `한전 평균 (${cost1.regionName})`,
            data: kepcoPattern1,
            borderColor: 'rgba(250, 204, 21, 1)', // Yellow
            borderWidth: 2, tension: 0.3, fill: false, borderDash: [5, 5]
        });

        if (cost1.regionKey !== cost2.regionKey && metroMap[cost1.regionKey] !== metroMap[cost2.regionKey]) {
            datasets.push({
                label: `한전 평균 (${cost2.regionName})`,
                data: kepcoPattern2,
                borderColor: 'rgba(249, 115, 22, 1)', // Orange
                borderWidth: 2, tension: 0.3, fill: false, borderDash: [5, 5]
            });
        }
    }

    monthlyLineChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => new Intl.NumberFormat('ko-KR').format(v/10000) + '만' } }
            },
            plugins: {
                tooltip: { callbacks: { label: c => c.dataset.label + ': ' + new Intl.NumberFormat('ko-KR').format(c.parsed.y) + '원' } }
            }
        }
    });
}

// --- 3. Live KMA API Sync ---
function initKmaApiSync() {
    const btnSync = document.getElementById('btn-sync-kma');
    if (!btnSync) return;

    btnSync.addEventListener('click', async () => {
        btnSync.textContent = "⏳ 연동 중...";
        btnSync.disabled = true;

        try {
            // CORS 우회를 위해 무료 프록시(allorigins) 사용
            const kmaUrl = 'https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php?tm=202211300900&stn=0&help=1&authKey=xJj9E05hTdCY_RNOYX3Qig';
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kmaUrl)}`;
            
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const textData = await response.text();

            // 데이터 파싱
            // 기상청 관측소 번호: 서울(108), 부산(159), 제주(184), 강릉(105), 춘천(101), 광주(156)
            const stnMap = { '108': 'Seoul', '159': 'Busan', '184': 'Jeju', '105': 'Gangneung', '101': 'Chuncheon', '156': 'Gwangju' };
            
            const lines = textData.split('\n');
            let updatedCount = 0;

            lines.forEach(line => {
                const p = line.trim().split(/\s+/);
                if (p.length > 13 && !isNaN(p[0])) {
                    const stn = p[1];
                    if (stnMap[stn]) {
                        const regionKey = stnMap[stn];
                        const temp = parseFloat(p[11]);
                        const wind = parseFloat(p[3]);
                        const humidity = parseFloat(p[13]);

                        // -9나 -99는 결측치
                        if (temp !== -99 && wind !== -9 && humidity !== -9) {
                            regionData[regionKey].temp = temp;
                            regionData[regionKey].wind = wind;
                            regionData[regionKey].humidity = humidity;
                            updatedCount++;
                        }
                    }
                }
            });

            if (updatedCount > 0) {
                btnSync.textContent = "✅ 연동 완료 (현재 날씨 기준)";
                btnSync.style.backgroundColor = 'rgba(16, 185, 129, 0.5)';
                btnSync.style.color = '#fff';
                alert(`기상청 실시간 데이터 연동 성공! ${updatedCount}개 주요 지역의 기온/습도/풍속이 최신화되었습니다.\n"나의 날씨 체질 진단기"를 다시 실행해보세요.`);
            } else {
                throw new Error('파싱된 관측소 데이터가 없습니다.');
            }

        } catch (error) {
            console.error('KMA API Sync Error:', error);
            btnSync.textContent = "❌ 연동 실패 (기본 데이터 사용)";
            alert('API 연동에 실패했습니다. CORS 정책 또는 키 만료일 수 있습니다. 기본 내장 데이터를 사용합니다.\n' + error.message);
        } finally {
            setTimeout(() => {
                btnSync.textContent = "📡 기상청 실시간 API 연동하기";
                btnSync.disabled = false;
                btnSync.style.backgroundColor = '';
                btnSync.style.color = '';
            }, 5000);
        }
    });
}

// --- 4. Live KEPCO API Sync ---
function initKepcoApiSync() {
    const btnSync = document.getElementById('btn-sync-kma').nextElementSibling; // The kepco button
    if (!btnSync) return;

    btnSync.addEventListener('click', async () => {
        btnSync.textContent = "⏳ 한전 데이터 조회 중...";
        btnSync.disabled = true;

        try {
            const apiKey = "c7oSwgcI9K5X4kyPAS33uOVZL05c874Z6i82yQhP";
            // 조회할 시도 코드: 서울(11), 부산(26), 광주(29), 강원(32), 제주(50)
            const metroCodes = ['11', '26', '29', '32', '50'];
            const kepcoBills = {};

            // 여러 시도 코드를 순회하며 데이터를 수집 (Promise.all을 사용하여 병렬 처리)
            const fetchPromises = metroCodes.map(async (metroCd) => {
                const kepcoUrl = `https://bigdata.kepco.co.kr/openapi/v1/powerUsage/houseAve.do?year=2020&month=11&metroCd=${metroCd}&apiKey=${apiKey}&returnType=json`;
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kepcoUrl)}`;
                
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Network response was not ok');
                
                const realResponse = await response.json();

                if (realResponse.data && realResponse.data.length > 0) {
                    // 시군구 데이터의 bill 평균 계산
                    let totalBill = 0;
                    realResponse.data.forEach(item => {
                        totalBill += item.bill;
                    });
                    kepcoBills[metroCd] = Math.round(totalBill / realResponse.data.length);
                }
            });

            await Promise.all(fetchPromises);

            if (Object.keys(kepcoBills).length === 0) {
                throw new Error('API에서 반환된 데이터가 없습니다.');
            }

            kepcoDataLoaded = kepcoBills; // 광역지자체별 요금 데이터 저장

            btnSync.textContent = "✅ 지역별 한전 실데이터 연동 완료";
            btnSync.style.backgroundColor = 'rgba(250, 204, 21, 0.5)';
            btnSync.style.color = '#fff';
            
            alert(`[한국전력공사 빅데이터] 지역별 실시간 호출 성공!\n조회된 광역지자체의 시/군/구별 평균 전기요금을 계산하여 지역별로 차트에 반영합니다.\n"상세 시뮬레이션 돌리기" 버튼을 눌러 정확한 비교를 확인하세요.`);

        } catch (error) {
            console.error('KEPCO API Sync Error:', error);
            btnSync.textContent = "❌ 한전 연동 실패";
            alert('한전 API 연동에 실패했습니다. 키가 만료되었거나 올바르지 않습니다.\n' + error.message);
        } finally {
            setTimeout(() => {
                btnSync.textContent = "⚡ 한전 빅데이터 연동";
                btnSync.disabled = false;
                btnSync.style.backgroundColor = '';
                btnSync.style.color = '';
            }, 5000);
        }
    });
}
