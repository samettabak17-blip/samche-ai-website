import { issue, L } from './factory.mjs';

const source = ['dashboard/src/features/channels/channels-page.tsx', 'dashboard/src/features/channels/instagram-connection-card.tsx', 'dashboard/src/features/conversations/conversations-page.tsx', 'website/lib/support-dashboard-map.mjs'];
const boundary = L(
  'Provider ownership, connection, provisioning, and tenant-specific workflow failures require SamChe or provider review. Do not invent a Dashboard route or a separate Instagram entitlement key.',
  'Sağlayıcı sahipliği, bağlantı, provisioning ve tenant özelindeki akış hataları SamChe veya sağlayıcı incelemesi gerektirir. Panel route’u veya ayrı Instagram entitlement key uydurmayın.',
  'تتطلب مشكلات ملكية المزوّد والاتصال والتجهيز ومسار الحساب مراجعة SamChe أو المزوّد. لا تخترع مساراً في اللوحة أو مفتاح استحقاق منفصلاً لـ Instagram.',
);

export const instagramDmArticles = Object.freeze([
  issue({
    slug: 'instagram-dm-ai-not-responding', category: 'Instagram DM AI', productArea: 'Instagram DM AI', issueType: 'response_failure',
    title: L('Instagram DM AI is not responding', 'Instagram DM AI yanıt vermiyor', 'Instagram DM AI لا يجيب'),
    summary: L('Check the connection, selected assistant, activation policy, and conversation handling state before escalating.', 'Eskalasyon öncesi bağlantıyı, seçili asistanı, etkinleştirme politikasını ve görüşme yönetim durumunu kontrol edin.', 'تحقق من الاتصال والمساعد وسياسة التفعيل وحالة إدارة المحادثة قبل التصعيد.'),
    plans: ['growth_by_scope', 'business', 'enterprise'], route: '/app/:tenantId/channels', navigation: 'Open Channels → Instagram Messaging / Instagram DM.',
    controls: ['Connect Instagram', 'Test Connection', 'Configure', 'assistant selection', 'AI activation policy', 'Take Over', 'Return to AI', 'Pause AI', 'Resume AI'],
    steps: [
      L('Open Channels and select Instagram Messaging or Instagram DM.', 'Channels bölümünü açıp Instagram Messaging veya Instagram DM seçin.', 'افتح Channels واختر Instagram Messaging أو Instagram DM.'),
      L('Run Test Connection, then open Configure and verify assistant selection and AI activation policy.', 'Test Connection çalıştırın; ardından Configure ile asistan seçimini ve AI etkinleştirme politikasını doğrulayın.', 'شغّل Test Connection ثم افتح Configure وتحقق من المساعد وسياسة تفعيل الذكاء الاصطناعي.'),
      L('Open the conversation and verify whether AI is paused or a human takeover is active.', 'Görüşmeyi açıp AI’nın duraklatılmış veya insan takeover durumunda olup olmadığını doğrulayın.', 'افتح المحادثة وتحقق مما إذا كان AI متوقفاً أو كان التولي البشري نشطاً.'),
    ],
    decisionTree: [{ question: L('Does Test Connection succeed?', 'Test Connection başarılı mı?', 'هل ينجح Test Connection؟'), yes: 'check-configuration', no: 'provider-review' }, { question: L('Is AI active for this conversation?', 'Bu görüşmede AI etkin mi?', 'هل AI نشط لهذه المحادثة؟'), yes: 'collect-evidence', no: 'resume-or-return-when-authorized' }],
    boundary,
    expected: L('The Instagram connection is healthy, the intended assistant and activation policy are selected, and the conversation handling mode matches the intended workflow.', 'Instagram bağlantısı sağlıklıdır; amaçlanan asistan ve etkinleştirme politikası seçilidir; görüşme yönetim modu amaçlanan akışla eşleşir.', 'يكون اتصال Instagram سليماً والمساعد وسياسة التفعيل محددين وحالة المحادثة مطابقة للمسار المقصود.'),
    causes: L(['Connection test fails.', 'No assistant is selected.', 'AI activation policy does not cover the conversation.', 'AI is paused or a human takeover is active.'], ['Bağlantı testi başarısız.', 'Asistan seçilmemiş.', 'AI etkinleştirme politikası görüşmeyi kapsamıyor.', 'AI duraklatılmış veya insan takeover etkin.'], ['فشل اختبار الاتصال.', 'لم يتم اختيار مساعد.', 'سياسة تفعيل AI لا تشمل المحادثة.', 'AI متوقف أو التولي البشري نشط.']),
    doNot: L(['Do not claim a transfer occurred unless Conversations visibly confirms it.'], ['Conversations görünür biçimde doğrulamadıkça transfer gerçekleştiğini söylemeyin.'], ['لا تدّع حدوث تحويل ما لم تؤكده Conversations بوضوح.']),
    supportChecklist: L(['Workspace', 'Instagram account', 'connection-test result', 'assistant selection', 'activation policy', 'conversation ID and time'], ['Çalışma alanı', 'Instagram hesabı', 'bağlantı testi sonucu', 'asistan seçimi', 'etkinleştirme politikası', 'görüşme ID ve zamanı'], ['مساحة العمل', 'حساب Instagram', 'نتيجة اختبار الاتصال', 'المساعد', 'سياسة التفعيل', 'معرّف المحادثة والوقت']),
    keywords: L(['Instagram DM not responding', 'Test Connection', 'Instagram AI paused'], ['Instagram DM yanıt vermiyor', 'Instagram bağlantı testi', 'Instagram AI duraklatıldı'], ['Instagram DM لا يجيب', 'اختبار اتصال Instagram', 'توقف Instagram AI']),
    related: ['instagram-dm-ai-setup'], sourceFiles: source, sourceRoutes: ['/app/:tenantId/channels', '/app/:tenantId/conversations/:channel'], coverageAreas: ['Instagram DM AI', 'Conversations / Shared Inbox', 'Human Handoff'],
  }),
  issue({
    slug: 'instagram-dm-ai-high-intent-flow', category: 'Instagram DM AI', productArea: 'Instagram DM AI', issueType: 'lead_workflow',
    title: L('Verify the Instagram DM high-intent lead flow', 'Instagram DM yüksek niyetli aday akışını doğrulayın', 'تحقق من مسار العميل المحتمل عالي النية في Instagram DM'),
    summary: L('Confirm contact and need capture, CRM lead creation, and the silent internal WhatsApp notification without promising a customer-facing transfer.', 'Müşteriye görünür transfer sözü vermeden iletişim ve ihtiyaç toplama, CRM aday kaydı ve sessiz dahili WhatsApp bildirimini doğrulayın.', 'تحقق من جمع بيانات التواصل والاحتياج وإنشاء سجل CRM وإشعار WhatsApp الداخلي الصامت من دون وعد بتحويل ظاهر للعميل.'),
    plans: ['growth_by_scope', 'business', 'enterprise'], route: '/app/:tenantId/conversations/:channel', navigation: 'Open the Instagram conversation, then inspect the related lead in Leads when authorized.',
    steps: [
      L('Confirm the conversation captured the customer’s contact details and stated need.', 'Görüşmenin müşterinin iletişim bilgilerini ve belirttiği ihtiyacı topladığını doğrulayın.', 'تحقق من أن المحادثة جمعت بيانات تواصل العميل واحتياجه.'),
      L('Open Leads and verify the tenant-scoped CRM lead record.', 'Leads bölümünü açıp tenant kapsamındaki CRM aday kaydını doğrulayın.', 'افتح Leads وتحقق من سجل العميل المحتمل ضمن مساحة العمل.'),
      L('Treat the internal WhatsApp notification as an internal signal; do not show or promise a transfer message to the customer.', 'Dahili WhatsApp bildirimini iç sinyal olarak ele alın; müşteriye transfer mesajı göstermeyin veya vaat etmeyin.', 'تعامل مع إشعار WhatsApp الداخلي كإشارة داخلية؛ لا تعرض أو تعد العميل برسالة تحويل.'),
    ],
    boundary,
    expected: L('A qualified CRM lead contains the captured contact and need, and the configured internal WhatsApp notification is sent without a customer-facing transfer message.', 'Nitelikli CRM adayında toplanan iletişim ve ihtiyaç bilgileri bulunur; yapılandırılmış dahili WhatsApp bildirimi müşteriye transfer mesajı gösterilmeden gönderilir.', 'يحتوي سجل CRM المؤهل على بيانات التواصل والاحتياج ويُرسل إشعار WhatsApp الداخلي المضبوط من دون رسالة تحويل ظاهرة للعميل.'),
    causes: L(['Required contact details were not captured.', 'The conversation did not reach the configured high-intent threshold.', 'CRM lead creation or internal notification failed.'], ['Zorunlu iletişim bilgileri toplanmadı.', 'Görüşme yapılandırılmış yüksek niyet eşiğine ulaşmadı.', 'CRM aday kaydı veya dahili bildirim başarısız oldu.'], ['لم تُجمع بيانات التواصل المطلوبة.', 'لم تصل المحادثة إلى حد النية العالي المضبوط.', 'فشل إنشاء سجل CRM أو الإشعار الداخلي.']),
    doNot: L(['Do not tell the customer that a live-agent transfer happened solely because the internal notification was sent.'], ['Yalnızca dahili bildirim gönderildi diye müşteriye canlı temsilci transferi gerçekleştiğini söylemeyin.'], ['لا تخبر العميل بحدوث تحويل إلى موظف لمجرد إرسال الإشعار الداخلي.']),
    supportChecklist: L(['Conversation ID', 'captured contact fields', 'captured need', 'lead ID', 'notification time and recipient'], ['Görüşme ID', 'toplanan iletişim alanları', 'toplanan ihtiyaç', 'aday ID', 'bildirim zamanı ve alıcısı'], ['معرّف المحادثة', 'بيانات التواصل', 'الاحتياج', 'معرّف العميل المحتمل', 'وقت الإشعار ومستلمه']),
    keywords: L(['Instagram lead qualification', 'CRM lead creation', 'internal WhatsApp notification', 'no transfer message'], ['Instagram aday nitelendirme', 'CRM aday kaydı', 'dahili WhatsApp bildirimi', 'transfer mesajı yok'], ['تأهيل عميل Instagram', 'إنشاء سجل CRM', 'إشعار WhatsApp داخلي', 'من دون رسالة تحويل']),
    related: ['instagram-dm-ai-setup'], sourceFiles: [...source, 'dashboard/src/features/leads/leads-page.tsx'], sourceRoutes: ['/app/:tenantId/conversations/:channel', '/app/:tenantId/leads'], coverageAreas: ['Instagram DM AI', 'CRM Leads'],
  }),
]);
