(function () {
  const sources = {
    care: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411_00073.html",
    medical: "https://www.mhlw.go.jp/stf/newpage_67729.html",
    careNotice: "https://www.mhlw.go.jp/web/t_doc?dataId=82aa0253&dataType=0&pageNo=1",
    medicalFee: "https://www.mhlw.go.jp/web/t_doc?dataId=84aa9734&dataType=0"
  };

  // Each rule keeps its match conditions and the existing result content together.
  // Priority follows the order of the original if / else if branches.
  function parseScaleValue(value) {
    const normalized = value.normalize("NFKC").toUpperCase();
    const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
    const kanji = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5 };
    return Number(normalized) || roman[normalized] || kanji[value] || null;
  }

  function getYahrGrade(text) {
    const match = text.match(/(?:ヤール(?:分類)?|Hoehn[-‐–\s]?Yahr|ホーエン・ヤール)\s*(?:分類|stage)?\s*(?:は|が|[:：])?\s*(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|IV|III|II|I|V|[1-5]|[１-５]|一|二|三|四|五)\s*(?:度|以上)?/i);
    return match ? parseScaleValue(match[1]) : null;
  }

  function getFunctionalDisabilityDegree(text) {
    const match = text.match(/生活機能障害度\s*(?:は|が|[:：])?\s*(Ⅰ|Ⅱ|Ⅲ|Ⅳ|IV|III|II|I|[1-4]|[１-４]|一|二|三|四)\s*(?:度)?/i);
    return match ? parseScaleValue(match[1]) : null;
  }

  function parkinsonsCriteria(text) {
    const yahr = getYahrGrade(text);
    const functionalDegree = getFunctionalDisabilityDegree(text);
    const complete = yahr !== null && functionalDegree !== null;
    const meets = complete && yahr >= 3 && (functionalDegree === 2 || functionalDegree === 3);
    const explicitlyFails = (yahr !== null && yahr < 3) || (functionalDegree !== null && functionalDegree !== 2 && functionalDegree !== 3);
    return { yahr, functionalDegree, meets, explicitlyFails };
  }

  function hasSpecialInstructionIssued(text) {
    if (/特別訪問看護指示書.{0,12}(?:なし|無い|未交付)|(?:なし|無い|未交付).{0,12}特別訪問看護指示書/.test(text)) return false;
    return /特別訪問看護指示書/.test(text) && /(?:あり|有り|交付|発行)/.test(text);
  }


  const rules = [
    {
      id: "parkinsons-table7-eligible",
      name: "パーキンソン病関連疾患・別表第7該当",
      targetInsurance: null,
      keywordGroups: [[/パーキンソン/]],
      condition: ({ searchText }) => parkinsonsCriteria(searchText).meets,
      priority: 160,
      result: {
        conclusion: "医療保険で算定可能です。ヤール分類3以上かつ、生活機能障害度Ⅱ度またはⅢ度に該当するためです。",
        pointsHtml: "<b>医療保険になる条件</b><ul><li>ヤール分類：3以上</li><li>生活機能障害度：Ⅱ度またはⅢ度</li></ul>",
        checklistHtml: "<b>見落としチェック</b>",
        source: { label: "根拠：厚生労働省 訪問看護に関する資料", url: sources.medical }
      }
    },
    {
      id: "parkinsons-table7-not-eligible",
      name: "パーキンソン病関連疾患・条件不該当",
      targetInsurance: null,
      keywordGroups: [[/パーキンソン/]],
      condition: ({ searchText }) => parkinsonsCriteria(searchText).explicitlyFails,
      priority: 155,
      result: {
        conclusion: "この条件では、別表第7には該当しません。医療保険の対象となるには、ヤール分類3以上かつ生活機能障害度Ⅱ度またはⅢ度が必要です。",
        pointsHtml: "<b>医療保険になる条件</b><ul><li>ヤール分類：3以上</li><li>生活機能障害度：Ⅱ度またはⅢ度</li></ul>",
        checklistHtml: "<b>見落としチェック</b>",
        source: { label: "根拠：厚生労働省 訪問看護に関する資料", url: sources.medical }
      }
    },
    {
      id: "special-visiting-nurse-instructions-issued",
      name: "特別訪問看護指示書あり",
      targetInsurance: null,
      keywordGroups: [[/特別訪問看護指示書/]],
      condition: ({ searchText }) => hasSpecialInstructionIssued(searchText),
      priority: 145,
      result: {
        conclusion: "特別訪問看護指示書により、頻回の訪問看護が可能です。指示期間は原則として指示日から14日が限度です。",
        pointsHtml: "<b>利用できる条件・確認事項</b><ul><li>特別訪問看護指示書が交付されている</li><li>指示期間を確認する</li><li>原則として指示日から14日以内</li></ul>",
        checklistHtml: "<b>見落としチェック</b>",
        source: { label: "根拠：厚生労働省 訪問看護療養費算定方法", url: sources.medicalFee }
      }
    },
    {
      id: "table7-or-table8",
      name: "別表第7・別表第8",
      targetInsurance: null,
      keywordGroups: [[/別表(?:第)?\s*(?:7|７|七|Ⅶ|8|８|八|Ⅷ)/]],
      priority: 130,
      result: {
        conclusion: "医療保険での訪問看護の対象となる可能性があります。別表第7または別表第8への該当と主治医の指示内容を確認してください。条件により週4日以上の訪問が可能となる場合があります。",
        pointsHtml: "<b>利用できる条件・確認事項</b><ul><li>別表第7該当の有無</li><li>別表第8該当の有無</li><li>主治医の指示内容</li></ul>",
        checklistHtml: "<b>見落としチェック</b>",
        source: { label: "根拠：厚生労働省 訪問看護に関する資料", url: sources.medical }
      }
    },
    {
      id: "discharge-day-guidance",
      name: "退院日の訪問・退院支援指導",
      targetInsurance: null,
      keywordGroups: [[/退院日/], [/(?:退院支援指導|療養上必要な指導)/]],
      priority: 125,
      result: {
        conclusion: "退院日に訪問する仕組みがあります。退院日に訪問看護ステーションの看護師等が療養上必要な指導を行う場合が対象です。",
        pointsHtml: "<b>利用できる条件・確認事項</b><ul><li>退院日に実施する</li><li>訪問看護ステーションの看護師等が実施する</li><li>療養上必要な指導を行う</li></ul>",
        checklistHtml: "<b>見落としチェック</b>",
        source: { label: "根拠：厚生労働省 訪問看護療養費算定方法", url: sources.medicalFee }
      }
    },

    {
      id: "care-initial-addon-type-i",
      name: "介護保険・退院／退所日の初回訪問（初回加算Ⅰ）",
      targetInsurance: ["介護保険", "わからない"],
      keywordGroups: [[/退院|退所/], [/初回加算|初回訪問|訪問でき/]],
      priority: 100,
      result: {
        conclusion: "初回加算Ⅰは、退院・退所日に初回訪問を行う場合に確認します。2026年度は条件を満たすと350単位です。",
        pointsHtml: "<b>初回加算Ⅰの確認条件</b><ul><li>退院・退所日に初回の訪問看護を行う</li><li>退院・退所元などの算定条件を確認する</li></ul><p>初回加算Ⅱ（300単位）とは併算定できません。</p>",
        checklistHtml: "<b>見落としチェック</b><br>初回加算ⅠとⅡは併算定できません。",
        source: { label: "根拠：厚生労働省 令和8年度介護報酬改定・算定基準", url: sources.careNotice }
      }
    },
    {
      id: "medical-discharge-initial-visit",
      name: "医療保険・退院／退所日の初回訪問",
      targetInsurance: ["医療保険"],
      keywordGroups: [[/退院|退所/], [/初回加算|初回訪問|訪問でき/]],
      priority: 90,
      result: {
        conclusion: "医療保険でも退院日に訪問する仕組みがありますが、「初回加算」という介護保険の加算とは別に考えます。",
        pointsHtml: "<b>確認すること</b><ul><li>退院日に在宅で療養上必要な指導を行ったか</li><li>退院支援指導の対象者か</li><li>退院後の最初の指定訪問看護との関係</li></ul>",
        checklistHtml: "<b>見落としチェック</b><br>医療保険では、退院支援指導加算は原則として退院日の翌日以降初日の指定訪問看護時に算定する仕組みです。対象者・算定タイミングを確認してください。",
        source: { label: "根拠：厚生労働省 訪問看護療養費算定方法", url: sources.medicalFee }
      }
    },
    {
      id: "care-initial-addon-type-ii",
      name: "介護保険・初回加算Ⅱ",
      targetInsurance: ["介護保険"],
      keywordGroups: [[/初回加算|初回訪問/], [/初回加算\s*[（(]?\s*(?:Ⅱ|II|2|２)|新規.{0,15}(?:訪問看護)?計画書|(?:訪問看護)?計画書.{0,12}(?:作成|作る)/]],
      priority: 85,
      result: {
        conclusion: "初回加算Ⅱは、新規に訪問看護計画書を作成し、初回訪問を行った場合に確認します。",
        pointsHtml: "<b>初回加算Ⅱの確認条件</b><ul><li>新規に訪問看護計画書を作成する</li><li>初回の訪問看護を行う</li></ul><p>退院・退所日に初回訪問を行う場合の初回加算Ⅰとは区別して確認します。ⅠとⅡは併算定できません。</p>",
        checklistHtml: "<b>見落としチェック</b><br>初回加算ⅠとⅡは併算定できません。",
        source: { label: "根拠：厚生労働省 令和8年度介護報酬改定資料", url: sources.careNotice }
      }
    },
    {
      id: "care-initial-or-resumed",
      name: "介護保険・初回加算／再開",
      targetInsurance: ["介護保険"],
      keywordGroups: [[/初回加算|再開|久しぶり/]],
      priority: 80,
      result: {
        conclusion: "介護保険の初回加算は「久しぶり」だけでは決まりません。過去の利用状況などの条件を確認してください。",
        pointsHtml: "<b>初回加算の確認ポイント</b><ul><li>同じ訪問看護事業所から過去2暦月に訪問看護を受けていないか</li><li>新規に訪問看護計画書を作成したか</li><li>退院・退所日に初回訪問を行う場合はⅠ、新規計画書を作成して初回訪問を行う場合はⅡを確認する</li></ul>",
        checklistHtml: "<b>見落としチェック</b><br>初回加算ⅠとⅡは併算定できません。医療保険による訪問看護の利用状況も確認対象になります。",
        source: { label: "根拠：厚生労働省 令和8年度介護報酬改定資料", url: sources.care }
      }
    },
    {
      id: "parkinsons-disease",
      name: "パーキンソン病の確認（重症度未入力）",
      targetInsurance: null,
      keywordGroups: [[/パーキンソン/]],
      condition: ({ searchText }) => {
        const status = parkinsonsCriteria(searchText);
        return !status.meets && !status.explicitlyFails;
      },
      priority: 70,
      result: {
        conclusion: "パーキンソン病だけでは、医療保険とは判定できません。ただし、次の条件を両方満たせば医療保険で算定可能です。",
        pointsHtml: "<b>医療保険になる条件</b><ul><li>ヤール分類：3以上</li><li>生活機能障害度：Ⅱ度またはⅢ度</li></ul><p>この2つの条件を両方満たす必要があります。</p>",
        checklistHtml: "<b>見落としチェック</b><br>この2つの条件を両方満たす必要があります。",
        source: null
      }
    },
    {
      id: "general-guidance",
      name: "一般案内",
      targetInsurance: null,
      keywordGroups: [],
      priority: 0,
      fallback: true,
      result: {
        conclusion: "このβ版では、入力内容から関連する条件を整理します。",
        pointsHtml: "<b>追加で確認すると精度が上がる情報</b><ul><li>保険の種類</li><li>訪問の目的・タイミング</li><li>指示書や特別な指示の有無</li><li>対象となる状態・重症度</li></ul>",
        checklistHtml: "<b>見落としチェック</b><br>制度上の条件が不足している場合は、推測で断定せず追加確認します。",
        source: null
      }
    }
  ];

  const orderedRules = rules.slice().sort((a, b) => b.priority - a.priority);

  function matchesRule(rule, insurance, searchText, condition, question) {
    if (rule.fallback) return true;
    if (rule.targetInsurance && !rule.targetInsurance.includes(insurance)) return false;
    if (!rule.keywordGroups.every((group) => group.some((pattern) => pattern.test(searchText)))) return false;
    return !rule.condition || rule.condition({ insurance, searchText, condition, question });
  }

  function renderResult(rule, check) {
    let html = "<h2>確認結果</h2>";
    html += "<div class='answer'>" + rule.result.conclusion + "</div>";
    if (rule.result.pointsHtml) html += "<div class='box'>" + rule.result.pointsHtml + "</div>";
    if (check && rule.result.checklistHtml) html += "<div class='warn'>" + rule.result.checklistHtml + "</div>";
    if (rule.result.source) {
      html += "<div class='source'>" + rule.result.source.label + "<br><a href=\"" + rule.result.source.url + "\" target=\"_blank\">一次資料を開く</a></div>";
    }
    return html;
  }

  function answer({ insurance, condition, question, check }) {
    let html = "<h2>確認結果</h2>";
    if (!question) {
      html += "<div class='answer'>知りたいことを入力してください。</div>";
      return html;
    }

    const searchText = question + condition;
    const rule = orderedRules.find((item) => matchesRule(item, insurance, searchText, condition, question));
    if (!rule) return html;
    return renderResult(rule, check);
  }

  window.NaviRules = { answer, rules };
})();
