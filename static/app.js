/**
 * PACTA - Frontend JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const contractForm = document.getElementById('contractForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const btnSendChat = document.getElementById('btnSendChat');
    const btnCeidg = document.getElementById('btnCeidg');
    const btnGenerate = document.getElementById('btnGenerate');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Fieldsets
    const fieldsetFirma = document.getElementById('fieldset_firma');
    const fieldsetOsoba = document.getElementById('fieldset_osoba');
    const groupDataKonca = document.getElementById('group_data_konca');
    
    // Chat history for context
    let chatHistory = [];
    
    // ==========================================
    // Form Type Toggle
    // ==========================================
    document.querySelectorAll('input[name="typ_umowy"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'z_dzialalnoscia') {
                fieldsetFirma.classList.remove('hidden');
                fieldsetOsoba.classList.add('hidden');
            } else {
                fieldsetFirma.classList.add('hidden');
                fieldsetOsoba.classList.remove('hidden');
            }
        });
    });
    
    // Contract duration toggle
    document.querySelectorAll('input[name="czas_umowy"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'okreslony') {
                groupDataKonca.classList.remove('hidden');
            } else {
                groupDataKonca.classList.add('hidden');
            }
        });
    });
    
    // ==========================================
    // CEIDG Integration
    // ==========================================
    btnCeidg.addEventListener('click', async function() {
        const nipInput = document.getElementById('nip');
        const nip = nipInput.value.replace(/[\s-]/g, '');
        
        if (!nip || nip.length !== 10) {
            alert('Wprowadź poprawny NIP (10 cyfr)');
            nipInput.focus();
            return;
        }
        
        btnCeidg.disabled = true;
        btnCeidg.textContent = '⏳ Pobieranie...';
        
        try {
            const response = await fetch(`/api/ceidg/${nip}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Błąd pobierania danych');
            }
            
            const data = await response.json();
            
            // Fill form fields
            if (data.nazwa) {
                document.getElementById('nazwa_firmy').value = data.nazwa;
                highlightField('nazwa_firmy');
            }
            if (data.imie && data.nazwisko) {
                document.getElementById('imie_nazwisko').value = `${data.imie} ${data.nazwisko}`;
                highlightField('imie_nazwisko');
            }
            if (data.adres) {
                document.getElementById('adres_firmy').value = data.adres;
                highlightField('adres_firmy');
            }
            if (data.kod_pocztowy) {
                document.getElementById('kod_pocztowy').value = data.kod_pocztowy;
                highlightField('kod_pocztowy');
            }
            if (data.miasto) {
                document.getElementById('miasto').value = data.miasto;
                highlightField('miasto');
            }
            if (data.regon) {
                document.getElementById('regon').value = data.regon;
                highlightField('regon');
            }
            
            addChatMessage('bot', `✅ Pobrano dane z CEIDG dla NIP: ${nip}`);
            
        } catch (error) {
            alert(error.message);
            addChatMessage('bot', `❌ Nie udało się pobrać danych z CEIDG: ${error.message}`);
        } finally {
            btnCeidg.disabled = false;
            btnCeidg.textContent = '🔍 Pobierz z CEIDG';
        }
    });
    
    function highlightField(fieldId) {
        const field = document.getElementById(fieldId);
        field.classList.add('highlight');
        setTimeout(() => field.classList.remove('highlight'), 2000);
    }
    
    // ==========================================
    // Chat Functions
    // ==========================================
    function addChatMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${role}`;
        
        const avatar = role === 'bot' ? '🤖' : '👤';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">${formatMessage(content)}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add to history
        chatHistory.push({
            role: role === 'bot' ? 'assistant' : 'user',
            content: content
        });
        
        // Keep history limited
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
        }
    }
    
    function formatMessage(text) {
        // Convert markdown-like formatting
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }
    
    async function sendChatMessage(message) {
        if (!message.trim()) return;
        
        // Add user message
        addChatMessage('user', message);
        chatInput.value = '';
        
        // Get current form data
        const formData = getFormData();
        
        // Show typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message message-bot';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">Piszę...</div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    form_data: formData,
                    chat_history: chatHistory.slice(-10)
                })
            });
            
            // Remove typing indicator
            document.getElementById('typing-indicator')?.remove();
            
            if (!response.ok) {
                throw new Error('Błąd połączenia z asystentem');
            }
            
            const data = await response.json();
            
            // Add bot response
            addChatMessage('bot', data.reply);
            
            // Apply form updates if any
            if (data.form_updates) {
                applyFormUpdates(data.form_updates);
            }
            
        } catch (error) {
            document.getElementById('typing-indicator')?.remove();
            addChatMessage('bot', `⚠️ ${error.message}. Spróbuj ponownie.`);
        }
    }
    
    function getFormData() {
        const form = contractForm;
        const data = {};
        
        // Get all form fields
        const formData = new FormData(form);
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }
    
    function applyFormUpdates(updates) {
        for (const [field, value] of Object.entries(updates)) {
            const element = document.getElementById(field) || 
                           document.querySelector(`[name="${field}"]`);
            
            if (element) {
                if (element.type === 'radio') {
                    // Handle radio buttons
                    const radio = document.querySelector(`[name="${field}"][value="${value}"]`);
                    if (radio) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change'));
                    }
                } else {
                    element.value = value;
                }
                highlightField(element.id || field);
            }
        }
    }
    
    // Chat event listeners
    btnSendChat.addEventListener('click', () => {
        sendChatMessage(chatInput.value);
    });
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage(chatInput.value);
        }
    });
    
    // Quick buttons
    document.querySelectorAll('.btn-quick').forEach(btn => {
        btn.addEventListener('click', function() {
            const question = this.dataset.question;
            sendChatMessage(question);
        });
    });
    
    // ==========================================
    // Contract Generation
    // ==========================================
    contractForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form
        if (!contractForm.checkValidity()) {
            contractForm.reportValidity();
            return;
        }
        
        // Get form data
        const formData = getFormData();
        
        // Additional validation based on type
        if (formData.typ_umowy === 'z_dzialalnoscia') {
            if (!formData.nip || !formData.nazwa_firmy) {
                alert('Wypełnij dane firmy');
                return;
            }
        } else {
            if (!formData.adres_zamieszkania || !formData.nr_dowodu || !formData.pesel) {
                alert('Wypełnij dane osobowe');
                return;
            }
        }
        
        // Show loading
        loadingOverlay.classList.remove('hidden');
        btnGenerate.disabled = true;
        
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Błąd generowania umowy');
            }
            
            // Download file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Get filename from header or generate
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'Umowa_B2B.docx';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=(.+)/);
                if (match) {
                    filename = match[1].replace(/"/g, '');
                }
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            addChatMessage('bot', `✅ Umowa została wygenerowana i pobrana: ${filename}`);
            
        } catch (error) {
            alert(error.message);
            addChatMessage('bot', `❌ Błąd generowania umowy: ${error.message}`);
        } finally {
            loadingOverlay.classList.add('hidden');
            btnGenerate.disabled = false;
        }
    });
    
    // ==========================================
    // Auto-fill today's date
    // ==========================================
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data_rozpoczecia').value = today;
    document.getElementById('klient_data_rozpoczecia').value = today;
});
