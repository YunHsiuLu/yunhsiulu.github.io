(() => {
  "use strict";

  const dataset = window.LANDING_DATA;
  const subjectLabels = { 國:"國文", 英:"英文", 甲:"數甲", 乙:"數乙", 物:"物理", 化:"化學", 生:"生物" };
  const categoryNames = { dream:"夢幻", challenge:"挑戰", steady:"穩健", safe:"保底" };
  const categoryKeys = ["dream", "challenge", "steady", "safe"];
  const scoreInputs = [...document.querySelectorAll("[data-subject]")];
  const schoolOptions = document.querySelector("#school-options");
  const schoolSearch = document.querySelector("#school-search");
  const schoolSuggestions = document.querySelector("#school-suggestions");
  const pickerStatus = document.querySelector("#school-picker-status");
  const results = document.querySelector("#results");
  const programBody = document.querySelector("#program-body");
  const formError = document.querySelector("#form-error");
  const collapsedSchools = new Set();
  let calculatedRows = [];
  let missingRows = [];
  let activeFilter = "all";
  let addedSchools = [...dataset.defaultSchools];
  let activeSchools = new Set(dataset.defaultSchools);
  let suggestionMatches = [];
  let activeSuggestion = -1;

  const schoolAliases = {
    "國立臺灣大學":"臺大 台大",
    "國立清華大學":"清大",
    "國立陽明交通大學":"陽交大",
    "國立成功大學":"成大",
    "國立政治大學":"政大",
    "國立中央大學":"中央",
    "國立中興大學":"中興 興大",
    "國立中正大學":"中正",
    "國立中山大學":"中山",
    "國立臺灣師範大學":"臺師大 台師大 師大",
    "國立彰化師範大學":"彰師大",
    "國立臺灣海洋大學":"海大 臺海大 台海大",
    "國立臺北大學":"北大",
    "東吳大學":"東吳",
    "長庚大學":"長庚",
    "中原大學":"中原",
    "國立高雄師範大學":"高師大",
    "國立臺北教育大學":"北教大",
    "國立臺中教育大學":"中教大",
    "國立臺南大學":"南大",
    "國立東華大學":"東華",
    "國立暨南國際大學":"暨大",
    "國立聯合大學":"聯大",
    "國立高雄大學":"高大",
    "高雄醫學大學":"高醫",
    "臺北醫學大學":"北醫"
  };
  const schoolProgramCounts = new Map(dataset.schoolOrder.map(school => [school, dataset.programs.filter(program => program.school === school).length]));

  const signed = value => `${value >= 0 ? "＋" : "－"}${Math.abs(value).toFixed(1)}`;
  const category = rate => rate <= -0.20 ? ["dream", "夢幻"] : rate <= 0 ? ["challenge", "挑戰"] : rate < 0.08 ? ["steady", "穩健"] : ["safe", "保底"];
  const formula = weights => Object.entries(weights).map(([subject, weight]) => `${subjectLabels[subject]}×${Number(weight).toFixed(weight % 1 ? 2 : 0)}`).join("＋");
  const escapeHTML = value => value.replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);
  const normalizeSchoolText = value => value.normalize("NFKC").replaceAll("台", "臺").replace(/\s+/g, "").toLocaleLowerCase("zh-Hant");
  const schoolSearchKey = school => normalizeSchoolText(`${school} ${school.replace(/^國立|^臺北市立/, "").replace(/大學$|醫學院$/, "")} ${schoolAliases[school] || ""}`);

  const selectedSchools = () => addedSchools.filter(school => activeSchools.has(school));

  const updateSchoolCount = () => {
    document.querySelector("#school-count").textContent = `已加入${addedSchools.length}校，勾選${selectedSchools().length}校`;
  };

  const renderSchoolOptions = () => {
    schoolOptions.innerHTML = addedSchools.map(school => `
      <div class="school-option">
        <label><input type="checkbox" value="${escapeHTML(school)}" ${activeSchools.has(school) ? "checked" : ""}><span title="${escapeHTML(school)}">${escapeHTML(school)}</span></label>
        <button type="button" class="remove-school" data-school="${escapeHTML(school)}" aria-label="移除${escapeHTML(school)}" title="從清單移除">×</button>
      </div>
    `).join("");
    schoolOptions.querySelectorAll("input").forEach(input => input.addEventListener("change", () => {
      input.checked ? activeSchools.add(input.value) : activeSchools.delete(input.value);
      updateSchoolCount();
    }));
    schoolOptions.querySelectorAll(".remove-school").forEach(button => button.addEventListener("click", () => {
      const school = button.dataset.school;
      addedSchools = addedSchools.filter(item => item !== school);
      activeSchools.delete(school);
      pickerStatus.textContent = `已從比較清單移除${school}。`;
      renderSchoolOptions();
      renderSchoolSuggestions();
    }));
    updateSchoolCount();
  };

  const matchingSchools = () => {
    const query = normalizeSchoolText(schoolSearch.value);
    return dataset.schoolOrder
      .filter(school => !addedSchools.includes(school) && (!query || schoolSearchKey(school).includes(query)))
      .slice(0, 8);
  };

  const closeSchoolSuggestions = () => {
    schoolSuggestions.hidden = true;
    schoolSearch.setAttribute("aria-expanded", "false");
    schoolSearch.removeAttribute("aria-activedescendant");
    activeSuggestion = -1;
  };

  const setActiveSuggestion = index => {
    const options = [...schoolSuggestions.querySelectorAll("[role=option][data-school]")];
    if (!options.length) return;
    activeSuggestion = (index + options.length) % options.length;
    options.forEach((option, optionIndex) => {
      const active = optionIndex === activeSuggestion;
      option.classList.toggle("active", active);
      option.setAttribute("aria-selected", String(active));
    });
    schoolSearch.setAttribute("aria-activedescendant", options[activeSuggestion].id);
    options[activeSuggestion].scrollIntoView({ block:"nearest" });
  };

  const renderSchoolSuggestions = () => {
    suggestionMatches = matchingSchools();
    activeSuggestion = -1;
    schoolSuggestions.innerHTML = suggestionMatches.length ? suggestionMatches.map((school, index) => `
      <li id="school-suggestion-${index}" role="option" data-school="${escapeHTML(school)}" aria-selected="false"><span>${escapeHTML(school)}</span><small>${schoolProgramCounts.get(school)}個校系</small></li>
    `).join("") : "<li class=\"no-options\">沒有符合且尚未加入的學校。</li>";
    schoolSuggestions.querySelectorAll("[role=option][data-school]").forEach(option => {
      option.addEventListener("mousedown", event => event.preventDefault());
      option.addEventListener("click", () => addSchool(option.dataset.school));
    });
    schoolSuggestions.hidden = false;
    schoolSearch.setAttribute("aria-expanded", "true");
  };

  const addSchool = school => {
    if (!school || addedSchools.includes(school)) return;
    addedSchools.push(school);
    activeSchools.add(school);
    schoolSearch.value = "";
    pickerStatus.textContent = `已新增${school}，共有${schoolProgramCounts.get(school)}個可計算校系。`;
    renderSchoolOptions();
    closeSchoolSuggestions();
    schoolSearch.focus();
  };

  const readScores = () => {
    const scores = {};
    let invalid = false;
    scoreInputs.forEach(input => {
      input.classList.remove("invalid");
      if (input.value.trim() === "") {
        scores[input.dataset.subject] = null;
        return;
      }
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < 0 || value > 60) {
        input.classList.add("invalid");
        invalid = true;
      } else {
        scores[input.dataset.subject] = value;
      }
    });
    if (invalid) throw new Error("每科成績必須介於0至60級分；請檢查標示的欄位。");
    if (Object.values(scores).every(value => value === null)) throw new Error("請至少輸入一科成績後再開始計算。");
    return scores;
  };

  const calculate = () => {
    formError.hidden = true;
    try {
      const scores = readScores();
      const schools = selectedSchools();
      if (!schools.length) throw new Error("請至少選擇一間學校。");
      const selected = new Set(schools);
      calculatedRows = [];
      missingRows = [];

      dataset.programs.filter(program => selected.has(program.school)).forEach(program => {
        const missing = Object.keys(program.weights).filter(subject => scores[subject] === null);
        if (missing.length) {
          missingRows.push({ ...program, missing });
          return;
        }
        const score = Object.entries(program.weights).reduce((sum, [subject, weight]) => sum + scores[subject] * weight, 0);
        const gap = score - program.cutoff;
        const rate = gap / program.cutoff;
        const [key, label] = category(rate);
        calculatedRows.push({ ...program, score, gap, rate, key, label });
      });

      collapsedSchools.clear();
      activeFilter = "all";
      document.querySelectorAll("[data-filter]").forEach(button => button.classList.toggle("active", button.dataset.filter === "all"));
      document.querySelector("#program-search").value = "";
      renderSummary(schools.length);
      renderPrograms();
      renderMissing();
      results.hidden = false;
      document.querySelector("#results-title").focus({ preventScroll:true });
      results.scrollIntoView({ behavior:"smooth", block:"start" });
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
      document.querySelector("#score-form").scrollIntoView({ behavior:"smooth", block:"start" });
    }
  };

  const renderSummary = schoolCount => {
    const counts = Object.fromEntries(categoryKeys.map(key => [key, calculatedRows.filter(row => row.key === key).length]));
    document.querySelector("#result-description").textContent = `已選擇${schoolCount}校；可完整計算${calculatedRows.length}個系組，另有${missingRows.length}個系組因缺少科目未分類。`;
    document.querySelector("#category-summary").innerHTML = `
      <div class="summary-box"><span class="label">完成計算</span><span class="count">${calculatedRows.length}</span></div>
      ${categoryKeys.map(key => `<div class="summary-box"><span class="tag ${key}">${categoryNames[key]}</span><span class="count">${counts[key]}</span><span class="label">占${calculatedRows.length ? (counts[key] / calculatedRows.length * 100).toFixed(1) : "0.0"}％</span></div>`).join("")}
      <div class="summary-box"><span class="label">資料不足</span><span class="count">${missingRows.length}</span></div>`;
  };

  const renderPrograms = () => {
    let lastSchool = "";
    programBody.innerHTML = calculatedRows.map(row => {
      const schoolCount = calculatedRows.filter(item => item.school === row.school).length;
      const header = row.school !== lastSchool ? `<tr class="school-row" data-school="${row.school}"><td colspan="7"><div class="school-heading"><span>${row.school}｜${schoolCount}個可計算系組</span><button type="button" class="school-toggle" aria-expanded="true">收合</button></div></td></tr>` : "";
      lastSchool = row.school;
      const searchText = `${row.school} ${row.code} ${row.name}`.toLocaleLowerCase("zh-Hant");
      return `${header}<tr data-program-row data-school="${row.school}" data-category="${row.key}" data-search="${searchText}">
        <td><span class="tag ${row.key}">${row.label}</span></td>
        <td><span class="code">${row.code}</span><br>${row.name}</td>
        <td class="formula">${formula(row.weights)}</td>
        <td class="score">${row.score.toFixed(2)}</td>
        <td class="score">${row.cutoff.toFixed(2)}</td>
        <td class="score ${row.gap >= 0 ? "positive" : "negative"}">${signed(row.gap)}</td>
        <td class="score ${row.rate >= 0 ? "positive" : "negative"}">${signed(row.rate * 100)}％</td>
      </tr>`;
    }).join("");

    document.querySelectorAll(".school-row").forEach(header => {
      header.querySelector(".school-toggle").addEventListener("click", () => {
        const school = header.dataset.school;
        collapsedSchools.has(school) ? collapsedSchools.delete(school) : collapsedSchools.add(school);
        updateVisibility();
      });
    });
    updateVisibility();
  };

  const updateVisibility = () => {
    const query = document.querySelector("#program-search").value.trim().toLocaleLowerCase("zh-Hant");
    const dataRows = [...document.querySelectorAll("[data-program-row]")];
    dataRows.forEach(row => {
      const categoryMatch = activeFilter === "all" || row.dataset.category === activeFilter;
      const searchMatch = !query || row.dataset.search.includes(query);
      row.hidden = !categoryMatch || !searchMatch || collapsedSchools.has(row.dataset.school);
    });
    document.querySelectorAll(".school-row").forEach(header => {
      const school = header.dataset.school;
      const matches = dataRows.some(row => row.dataset.school === school && (activeFilter === "all" || row.dataset.category === activeFilter) && (!query || row.dataset.search.includes(query)));
      const collapsed = collapsedSchools.has(school);
      header.hidden = !matches;
      const button = header.querySelector(".school-toggle");
      button.textContent = collapsed ? "展開" : "收合";
      button.setAttribute("aria-expanded", String(!collapsed));
    });
  };

  const renderMissing = () => {
    document.querySelector("#missing-count").textContent = missingRows.length;
    document.querySelector("#missing-list").innerHTML = missingRows.map(row => `
      <div class="missing-item"><span><span class="code">${row.code}</span>　${row.school}｜${row.name}</span><span>缺少：${row.missing.map(subject => subjectLabels[subject]).join("、")}</span></div>
    `).join("") || "<p>沒有因缺少科目而無法計算的系組。</p>";
  };

  document.querySelector("#calculate-button").addEventListener("click", calculate);
  document.querySelector("#reset-button").addEventListener("click", () => {
    scoreInputs.forEach(input => { input.value = ""; input.classList.remove("invalid"); });
    formError.hidden = true;
    results.hidden = true;
    scoreInputs[0].focus();
  });
  document.querySelector("#restore-default-schools").addEventListener("click", () => {
    addedSchools = [...dataset.defaultSchools];
    activeSchools = new Set(dataset.defaultSchools);
    pickerStatus.textContent = "已恢復16間預設學校。";
    renderSchoolOptions();
    closeSchoolSuggestions();
  });
  document.querySelector("#select-all-schools").addEventListener("click", () => {
    activeSchools = new Set(addedSchools);
    renderSchoolOptions();
  });
  document.querySelector("#clear-all-schools").addEventListener("click", () => {
    activeSchools.clear();
    renderSchoolOptions();
  });
  schoolSearch.addEventListener("focus", renderSchoolSuggestions);
  schoolSearch.addEventListener("input", () => {
    pickerStatus.textContent = "";
    renderSchoolSuggestions();
  });
  schoolSearch.addEventListener("keydown", event => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (schoolSuggestions.hidden) renderSchoolSuggestions();
      setActiveSuggestion(activeSuggestion + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (schoolSuggestions.hidden) renderSchoolSuggestions();
      setActiveSuggestion(activeSuggestion - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      addSchool(suggestionMatches[activeSuggestion >= 0 ? activeSuggestion : 0]);
    } else if (event.key === "Escape") {
      closeSchoolSuggestions();
    }
  });
  document.querySelector("#add-school-button").addEventListener("click", () => {
    suggestionMatches = matchingSchools();
    if (suggestionMatches.length) addSchool(suggestionMatches[0]);
    else {
      pickerStatus.textContent = "找不到可新增的學校，請換一個關鍵字。";
      schoolSearch.focus();
    }
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".school-combobox")) closeSchoolSuggestions();
  });
  document.querySelector("#program-search").addEventListener("input", updateVisibility);
  document.querySelector("#print-button").addEventListener("click", () => window.print());
  document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button));
    updateVisibility();
  }));
  document.querySelector("#collapse-all").addEventListener("click", () => { dataset.schoolOrder.forEach(school => collapsedSchools.add(school)); updateVisibility(); });
  document.querySelector("#expand-all").addEventListener("click", () => { collapsedSchools.clear(); updateVisibility(); });

  renderSchoolOptions();
})();
