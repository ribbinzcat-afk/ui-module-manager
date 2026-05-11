import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
// UPDATE: เพิ่ม reloadCurrentChat เข้ามาเพื่อใช้ล้างหน้าจอ
import { saveSettingsDebounced, reloadCurrentChat } from "../../../../script.js";
import { eventSource, event_types } from "../../../../script.js";

const extensionName = "ui-module-manager";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = {
    modules: [],
    presets: {},
    showQuickBtn: true
};

let editingModuleId = null;

// UPDATE: แก้ไขการแสดงผลรายชื่อโมดูลให้เป็นกล่องแยกชิ้น และปุ่มไม่เบียดกัน
function renderModuleList() {
    const listContainers = $(".module-list-container");
    listContainers.empty();

    const modules = extension_settings[extensionName].modules;

    if (modules.length === 0) {
        listContainers.append("<div style='padding: 10px; color: #888; text-align: center;'>No modules added yet.</div>");
        return;
    }

    modules.forEach((module) => {
        const isChecked = module.enabled ? "checked" : "";
        const scopeLabel = module.scope === "global" ? `Global` : `Char: ${module.targetChar}`;

        // จัดโครงสร้าง HTML ใหม่ ใช้ flexbox เพื่อดันปุ่มไปไว้ด้านขวา
        const itemHtml = `
            <div class="ui-module-item" style="background-color: #ffffff; border-radius: 10px; padding: 12px; margin-bottom: 10px; border: 1px solid #f1eef6; box-shadow: 0 2px 5px rgba(0,0,0,0.02); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <input type="checkbox" class="ui-module-toggle" data-id="${module.id}" ${isChecked} style="transform: scale(1.2); cursor: pointer;">
                    <div style="line-height: 1.2;">
                        <b style="color: #5c5c5c; font-size: 1.05em;">${module.name}</b><br>
                        <span class="scope-label" style="background-color: #e9ecef; color: #6c757d; font-size: 0.75em; padding: 3px 8px; border-radius: 12px; display: inline-block; margin-top: 4px;">${scopeLabel}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 5px; flex-shrink: 0;">
                    <input type="button" class="menu_button ui-module-edit" data-id="${module.id}" value="Edit" style="background-color: #cbf0f8; padding: 4px 10px; font-size: 0.85em;">
                    <input type="button" class="menu_button ui-module-delete" data-id="${module.id}" value="Delete" style="background-color: #ffb4a2; padding: 4px 10px; font-size: 0.85em;">
                </div>
            </div>
        `;
        listContainers.append(itemHtml);
    });
}

function renderPresetList() {
    const selects = $(".preset-select-input");
    selects.find('option:not(:first)').remove();

    const presets = extension_settings[extensionName].presets || {};
    Object.keys(presets).forEach(presetName => {
        selects.append(`<option value="${presetName}">${presetName}</option>`);
    });
}

function updateQuickButtonVisibility() {
    if (extension_settings[extensionName].showQuickBtn) {
        $("#ui-module-quick-btn").css("display", "flex");
    } else {
        $("#ui-module-quick-btn").css("display", "none");
    }
}

async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
    if (!extension_settings[extensionName].presets) extension_settings[extensionName].presets = {};
    if (typeof extension_settings[extensionName].showQuickBtn === 'undefined') extension_settings[extensionName].showQuickBtn = true;

    renderModuleList();
    renderPresetList();

    $(".toggle-quick-btn-input").prop("checked", extension_settings[extensionName].showQuickBtn);
    updateQuickButtonVisibility();
}

function executeActiveModules(messageData) {
    const context = { message: messageData, chatId: getContext().chatId, characters: getContext().characters };
    const currentCharacterId = getContext().characterId;
    let currentCharacterName = "";

    if (currentCharacterId !== undefined && context.characters[currentCharacterId]) {
        currentCharacterName = context.characters[currentCharacterId].name;
    }

    const activeModules = extension_settings[extensionName].modules.filter(m => m.enabled);
    if (activeModules.length === 0) return;

    activeModules.forEach(module => {
        try {
            let shouldExecute = false;
            if (!module.scope || module.scope === "global") {
                shouldExecute = true;
            } else if (module.scope === "character" && currentCharacterName) {
                const targetName = (module.targetChar || "").trim().toLowerCase();
                const currentName = currentCharacterName.trim().toLowerCase();
                if (targetName === currentName) shouldExecute = true;
            }

            if (shouldExecute) {
                const executeCode = new Function('ctx', module.code);
                executeCode(context);
            }
        } catch (error) {
            console.error(`[${extensionName}] Error executing module '${module.name}':`, error);
        }
    });
}

jQuery(async () => {
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);

        // UPDATE: แยกชิ้นส่วน HTML ออกจากกัน
        // 1. ส่วน Drawer (คนพี่) ให้เอาไปใส่ในแผง Extensions เหมือนเดิม
        const drawerHtml = $(settingsHtml).filter('.ui-module-manager-settings').first();
        $("#extensions_settings2").append(drawerHtml);

        // 2. ส่วน Pop-up (คนน้อง) และ Floating Editor ให้เอาไปแปะไว้ที่ Body เลย เพื่อให้ลอยทับทุกหน้าต่าง
        const modalsHtml = $(settingsHtml).filter('#ui-module-main-modal, #ui-module-editor-modal');
        $("body").append(modalsHtml);

        const quickBtnHtml = `
            <div id="ui-module-quick-btn" title="Open UI Module Manager" style="display: none; color: #cdb4db; cursor: pointer; padding: 10px; font-size: 1.2em; transition: all 0.2s ease;">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
        `;
        if ($("#ui-module-quick-btn").length === 0) {
            $("#send_but").before(quickBtnHtml);
        }

        loadSettings();

        // Event: เปิด Pop-up ด้วยคทา
        $(document).on("click", "#ui-module-quick-btn", () => {
            $("#ui-module-main-modal").css("display", "flex");
        });

        // Event: ปิด Pop-up
        $(document).on("click", "#ui-module-main-close", () => {
            $("#ui-module-main-modal").css("display", "none");
        });

        // Event: สวิตช์เปิด/ปิดปุ่มคทา
        $(document).on("change", ".toggle-quick-btn-input", function() {
            const isChecked = $(this).prop("checked");
            $(".toggle-quick-btn-input").prop("checked", isChecked);
            extension_settings[extensionName].showQuickBtn = isChecked;
            saveSettingsDebounced();
            updateQuickButtonVisibility();
        });

        // Event: Scope Dropdown
        $(document).on("change", ".scope-select-input", function() {
            const scope = $(this).val();
            const container = $(this).closest('.ui-module-manager-settings');
            if (scope === "character") {
                container.find(".char-container-div").css("display", "flex");
            } else {
                container.find(".char-container-div").css("display", "none");
                container.find(".char-name-input").val("");
            }
        });

        // 🟢 Event: Add / Save Module
        $(document).on("click", ".add-module-btn", function() {
            const container = $(this).closest('.ui-module-manager-settings');
            const nameInput = container.find(".module-name-input").val().trim();
            const codeInput = container.find(".module-code-input").val().trim();
            const scopeSelect = container.find(".scope-select-input").val();
            const charInput = container.find(".char-name-input").val().trim();

            if (!nameInput || !codeInput) { toastr.warning("Please enter both Name and Code."); return; }
            if (scopeSelect === "character" && !charInput) { toastr.warning("Please enter a Character Name."); return; }

            if (editingModuleId) {
                const moduleIndex = extension_settings[extensionName].modules.findIndex(m => m.id === editingModuleId);
                if (moduleIndex !== -1) {
                    extension_settings[extensionName].modules[moduleIndex] = { ...extension_settings[extensionName].modules[moduleIndex], name: nameInput, code: codeInput, scope: scopeSelect, targetChar: charInput };
                    toastr.success(`Module updated!`);
                }
                editingModuleId = null;
                $(".add-module-btn").val("Add Module").css("background-color", "#ffc8dd");
            } else {
                extension_settings[extensionName].modules.push({ id: Date.now().toString(), name: nameInput, code: codeInput, enabled: false, scope: scopeSelect, targetChar: charInput });
                toastr.success(`Module added!`);
            }

            saveSettingsDebounced();
            $(".module-name-input, .module-code-input, .char-name-input").val("");
            $(".scope-select-input").val("global").trigger("change");
            renderModuleList();

        setTimeout(() => {
            if (typeof reloadCurrentChat === 'function') reloadCurrentChat();
        }, 300);

        });

        // Event: Edit Module
        $(document).on("click", ".ui-module-edit", function() {
            const moduleId = $(this).data("id");
            const module = extension_settings[extensionName].modules.find(m => m.id === String(moduleId));
            if (module) {
                const container = $(this).closest('.ui-module-manager-settings');
                // อัปเดตข้อมูลในฟอร์มของหน้าต่างที่กด
                container.find(".module-name-input").val(module.name);
                container.find(".module-code-input").val(module.code);
                container.find(".scope-select-input").val(module.scope || "global").trigger("change");
                if (module.scope === "character") container.find(".char-name-input").val(module.targetChar || "");

                editingModuleId = module.id;
                container.find(".add-module-btn").val("Save Changes").css("background-color", "#2ecc71");
                container.find(".module-name-input")[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        // 🟢 Event: Toggle & Delete Module
        $(document).on("change", ".ui-module-toggle", function() {
            const moduleId = $(this).data("id");
            const isEnabled = $(this).prop("checked");
            const module = extension_settings[extensionName].modules.find(m => m.id === String(moduleId));
            if (module) {
                module.enabled = isEnabled;
                saveSettingsDebounced();
                $(`.ui-module-toggle[data-id='${moduleId}']`).prop("checked", isEnabled);

        setTimeout(() => {
            if (typeof reloadCurrentChat === 'function') reloadCurrentChat();
        }, 300);
        
            }
        });

        $(document).on("click", ".ui-module-delete", function() {
            if ($(this).hasClass("delete-preset-btn")) return;
            if (!confirm("Delete this module?")) return;
            const moduleId = $(this).data("id");
            extension_settings[extensionName].modules = extension_settings[extensionName].modules.filter(m => m.id !== String(moduleId));
            saveSettingsDebounced();
            renderModuleList();
        });

        // Event: Presets
        $(document).on("click", ".save-preset-btn", function() {
            const container = $(this).closest('.ui-module-manager-settings');
            const presetName = container.find(".preset-name-input").val().trim();
            if (!presetName) { toastr.warning("Please enter a preset name."); return; }

            const activeModuleIds = extension_settings[extensionName].modules.filter(m => m.enabled).map(m => m.id);
            extension_settings[extensionName].presets[presetName] = activeModuleIds;
            saveSettingsDebounced();

            $(".preset-name-input").val("");
            renderPresetList();
            $(".preset-select-input").val(presetName);
            toastr.success(`Preset saved!`);
        });

        $(document).on("click", ".load-preset-btn", function() {
            const container = $(this).closest('.ui-module-manager-settings');
            const presetName = container.find(".preset-select-input").val();
            if (!presetName) return;

            const activeIds = extension_settings[extensionName].presets[presetName];
            if (!activeIds) return;

            extension_settings[extensionName].modules.forEach(module => {
                module.enabled = activeIds.includes(module.id);
            });
            saveSettingsDebounced();
            renderModuleList();
            toastr.success(`Preset loaded!`);
        });
        
        $(document).on("click", ".load-preset-btn", function() {
            const container = $(this).closest('.ui-module-manager-settings');
            const presetName = container.find(".preset-select-input").val();
            if (!presetName) return;

            const activeIds = extension_settings[extensionName].presets[presetName];
            if (!activeIds) return;

            extension_settings[extensionName].modules.forEach(module => {
                module.enabled = activeIds.includes(module.id);
            });
            saveSettingsDebounced();
            renderModuleList();
            toastr.success(`Preset loaded!`);

            // NEW: สั่งให้ระบบรันโค้ดใหม่ทันทีหลังโหลด Preset
        setTimeout(() => {
            if (typeof reloadCurrentChat === 'function') reloadCurrentChat();
        }, 300);
        
        });

        $(document).on("click", ".delete-preset-btn", function() {
            const container = $(this).closest('.ui-module-manager-settings');
            const presetName = container.find(".preset-select-input").val();
            if (!presetName) return;

            if (!confirm(`Delete preset "${presetName}"?`)) return;
            delete extension_settings[extensionName].presets[presetName];
            saveSettingsDebounced();
            renderPresetList();
            toastr.success(`Preset deleted.`);
        });

        // Event: Floating Editor
        let currentCodeInput = null;
        $(document).on("click", ".expand-editor-btn", function() {
            const container = $(this).closest('.ui-module-manager-settings');
            currentCodeInput = container.find(".module-code-input");
            $("#ui-module-modal-textarea").val(currentCodeInput.val());
            $("#ui-module-editor-modal").css("display", "flex");
        });

        $(document).on("click", "#ui-module-modal-close, #ui-module-modal-cancel", () => {
            $("#ui-module-editor-modal").css("display", "none");
        });

        $(document).on("click", "#ui-module-modal-apply", () => {
            if (currentCodeInput) {
                currentCodeInput.val($("#ui-module-modal-textarea").val());
                $(".module-code-input").val($("#ui-module-modal-textarea").val());
            }
            $("#ui-module-editor-modal").css("display", "none");
        });

        // Event: ปิด Pop-up เมื่อคลิกพื้นหลัง
        $(window).on("click", (event) => {
            if ($(event.target).is("#ui-module-main-modal")) $("#ui-module-main-modal").css("display", "none");
            if ($(event.target).is("#ui-module-editor-modal")) $("#ui-module-editor-modal").css("display", "none");
        });

        // 🟢 Event: ดักจับข้อความและการเรนเดอร์ (อัปเดตใหม่ให้แม่นยำขึ้น)

        // 1. เมื่อมีข้อความใหม่ส่งเข้ามา (หน่วงเวลาเพิ่มเป็น 800ms เพื่อรอให้ DOM สร้างเสร็จ)
        eventSource.on(event_types.MESSAGE_RECEIVED, (messageData) => {
            setTimeout(() => executeActiveModules(messageData), 800);
        });

        // 2. เมื่อข้อความถูกอัปเดต (เช่น AI พิมพ์เสร็จจากระบบ Streaming หรือมีการกด Edit)
        // ใช้ Debounce จำลองเพื่อไม่ให้มันรันถี่เกินไปตอนกำลัง Stream
        let updateTimeout;
        eventSource.on(event_types.MESSAGE_UPDATED, (messageData) => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => executeActiveModules(messageData), 500);
        });

        // 3. เมื่อสลับห้องแชท หรือโหลดหน้าเว็บครั้งแรก
        eventSource.on(event_types.CHAT_CHANGED, () => {
            setTimeout(() => executeActiveModules(null), 800);
        });

    } catch (error) {
        console.error(`[${extensionName}] ❌ Failed to load:`, error);
    }
});
