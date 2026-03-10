import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
/**
 * Cloud Function para criar profissional
 *
 * Body esperado:
 * {
 *   email: string (email do profissional)
 *   password: string (senha temporária)
 *   name: string (nome completo)
 *   phone: string (telefone)
 *   commissionRate: number (percentual, ex: 40)
 *   ownerId: string (UID do dono do salão)
 * }
 *
 * Retorna:
 * {
 *   success: true,
 *   uid: string (UID gerado do profissional),
 *   email: string
 * }
 */
export const createProfessional = functions.https.onCall(async (data, context) => {
    // Verificar autenticação
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { email, password, name, phone, commissionRate, ownerId } = data;
    // Validação dos dados
    if (!email || !password || !name || !phone || commissionRate === undefined || !ownerId) {
        throw new functions.https.HttpsError('invalid-argument', 'Todos os campos são obrigatórios: email, password, name, phone, commissionRate, ownerId');
    }
    if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'commissionRate deve ser um número entre 0 e 100');
    }
    // Verificar se o usuário autenticado é o dono do salão
    if (context.auth.uid !== ownerId) {
        throw new functions.https.HttpsError('permission-denied', 'Você só pode criar profissionais para sua conta');
    }
    try {
        // 1. Criar usuário no Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });
        // 2. Criar documento em professionalLinks
        await db.collection('professionalLinks').doc(userRecord.uid).set({
            ownerId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 3. Criar documento em users/{ownerId}/professionals/{uid}
        await db
            .collection('users')
            .doc(ownerId)
            .collection('professionals')
            .doc(userRecord.uid)
            .set({
            name,
            email,
            phone,
            role: 'profissional',
            firebaseUid: userRecord.uid,
            commissionRate,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 4. Retornar sucesso
        return {
            success: true,
            uid: userRecord.uid,
            email: userRecord.email,
            message: `Profissional ${name} criado com sucesso!`,
        };
    }
    catch (error) {
        // Tratamento de erros específicos do Firebase Auth
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'Este email já está registrado no sistema');
        }
        else if (error.code === 'auth/invalid-email') {
            throw new functions.https.HttpsError('invalid-argument', 'Email inválido. Verifique o formato.');
        }
        else if (error.code === 'auth/weak-password') {
            throw new functions.https.HttpsError('invalid-argument', 'Senha fraca. Use pelo menos 6 caracteres.');
        }
        // Log do erro para debugging
        console.error('Erro ao criar profissional:', error);
        throw new functions.https.HttpsError('internal', 'Erro ao criar profissional. Tente novamente mais tarde.');
    }
});
/**
 * Cloud Function para deletar profissional (desativar)
 *
 * Body esperado:
 * {
 *   professionalId: string (UID do profissional a deletar)
 *   ownerId: string (UID do dono)
 * }
 */
export const deactivateProfessional = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { professionalId, ownerId } = data;
    if (!professionalId || !ownerId) {
        throw new functions.https.HttpsError('invalid-argument', 'professionalId e ownerId são obrigatórios');
    }
    // Verificar permissão
    if (context.auth.uid !== ownerId) {
        throw new functions.https.HttpsError('permission-denied', 'Você só pode desativar profissionais da sua conta');
    }
    try {
        // Desativar profissional no Firestore
        await db
            .collection('users')
            .doc(ownerId)
            .collection('professionals')
            .doc(professionalId)
            .update({
            isActive: false,
            deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Desativar usuário no Firebase Auth
        await auth.updateUser(professionalId, {
            disabled: true,
        });
        return {
            success: true,
            message: 'Profissional desativado com sucesso',
        };
    }
    catch (error) {
        console.error('Erro ao desativar profissional:', error);
        throw new functions.https.HttpsError('internal', 'Erro ao desativar profissional. Tente novamente mais tarde.');
    }
});
const DAYS_PT = {
    0: 'domingo',
    1: 'segunda',
    2: 'terca',
    3: 'quarta',
    4: 'quinta',
    5: 'sexta',
    6: 'sabado',
};
const parseTimeToMinutes = (value, fallback) => {
    const [hours, minutes] = value.split(':').map(Number);
    if (Number.isFinite(hours) &&
        Number.isFinite(minutes) &&
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59) {
        return hours * 60 + minutes;
    }
    return fallback;
};
const buildSlots = ({ date, duration, open, close, appointments, }) => {
    const slots = [];
    const openMin = parseTimeToMinutes(open, 8 * 60);
    const closeMin = parseTimeToMinutes(close, 18 * 60);
    for (let current = openMin; current + duration <= closeMin; current += duration) {
        const hour = Math.floor(current / 60);
        const minute = current % 60;
        const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        const hasConflict = appointments.some((appointment) => {
            const status = appointment.data.status;
            if (status === 'cancelado')
                return false;
            const startField = appointment.data.date;
            if (!startField)
                return false;
            const appointmentStart = startField.toDate();
            const endField = appointment.data.endTime;
            const appointmentDuration = typeof appointment.data.duration === 'number' && appointment.data.duration > 0
                ? appointment.data.duration
                : 60;
            const appointmentEnd = endField
                ? endField.toDate()
                : new Date(appointmentStart.getTime() + appointmentDuration * 60000);
            return slotStart < appointmentEnd && slotEnd > appointmentStart;
        });
        if (!hasConflict) {
            slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        }
    }
    return slots;
};
export const getPublicAvailability = functions.https.onCall(async (data) => {
    const userId = data?.userId?.trim();
    const dateStr = data?.date?.trim();
    const requestedDuration = data?.duration;
    const excludeAppointmentId = data?.excludeAppointmentId?.trim();
    if (!userId || !dateStr) {
        throw new functions.https.HttpsError('invalid-argument', 'userId e date sao obrigatorios');
    }
    const duration = typeof requestedDuration === 'number' && requestedDuration > 0 && requestedDuration <= 600
        ? requestedDuration
        : 60;
    const dayDate = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(dayDate.getTime())) {
        throw new functions.https.HttpsError('invalid-argument', 'Data invalida');
    }
    const startOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);
    const settingsDoc = await db
        .collection('users')
        .doc(userId)
        .collection('settings')
        .doc('business')
        .get();
    const schedule = settingsDoc.exists ? (settingsDoc.data()?.schedule ?? null) : null;
    const dayKey = DAYS_PT[dayDate.getDay()];
    const daySchedule = schedule?.[dayKey];
    if (daySchedule?.enabled === false) {
        return { slots: [] };
    }
    const appointmentsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('appointments')
        .where('date', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('date', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .get();
    const appointments = appointmentsSnapshot.docs
        .filter((doc) => !excludeAppointmentId || doc.id !== excludeAppointmentId)
        .map((doc) => ({ id: doc.id, data: doc.data() }));
    const slots = buildSlots({
        date: dayDate,
        duration,
        open: daySchedule?.open ?? '08:00',
        close: daySchedule?.close ?? '18:00',
        appointments,
    });
    return { slots };
});
export const getReschedulingData = functions.https.onCall(async (data) => {
    const token = data?.token?.trim();
    if (!token || token.length < 20) {
        throw new functions.https.HttpsError('invalid-argument', 'Token invalido');
    }
    const snapshot = await db
        .collectionGroup('appointments')
        .where('reschedulingToken', '==', token)
        .limit(1)
        .get();
    if (snapshot.empty) {
        throw new functions.https.HttpsError('not-found', 'Link de reagendamento nao encontrado');
    }
    const appointmentDoc = snapshot.docs[0];
    const appointmentData = appointmentDoc.data();
    const userId = appointmentDoc.ref.parent.parent?.id;
    if (!userId) {
        throw new functions.https.HttpsError('internal', 'Estrutura do agendamento invalida');
    }
    const expiresAt = appointmentData.reschedulingExpiresAt;
    if (!expiresAt || expiresAt.toDate().getTime() < Date.now()) {
        throw new functions.https.HttpsError('failed-precondition', 'Link de reagendamento expirado');
    }
    const serviceId = String(appointmentData.serviceId || '');
    const serviceDoc = serviceId
        ? await db.collection('users').doc(userId).collection('services').doc(serviceId).get()
        : null;
    const serviceData = serviceDoc?.exists ? serviceDoc.data() : null;
    const appointmentDuration = typeof appointmentData.duration === 'number' && appointmentData.duration > 0
        ? appointmentData.duration
        : typeof serviceData?.duration === 'number' && serviceData.duration > 0
            ? serviceData.duration
            : 60;
    const dateField = appointmentData.date;
    return {
        appointment: {
            id: appointmentDoc.id,
            userId,
            serviceId,
            serviceName: String(appointmentData.serviceName || ''),
            price: Number(appointmentData.price ?? appointmentData.servicePrice ?? 0),
            time: String(appointmentData.time || ''),
            duration: appointmentDuration,
            dateIso: dateField ? dateField.toDate().toISOString() : null,
        },
        service: serviceData
            ? {
                id: serviceDoc?.id ?? serviceId,
                name: String(serviceData.name || ''),
                duration: typeof serviceData.duration === 'number' && serviceData.duration > 0
                    ? serviceData.duration
                    : 60,
                price: Number(serviceData.price ?? 0),
            }
            : null,
    };
});
export const rescheduleWithToken = functions.https.onCall(async (data) => {
    const token = data?.token?.trim();
    const date = data?.date?.trim();
    const time = data?.time?.trim();
    if (!token || !date || !time) {
        throw new functions.https.HttpsError('invalid-argument', 'token, date e time sao obrigatorios');
    }
    const validTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
    if (!validTime) {
        throw new functions.https.HttpsError('invalid-argument', 'Horario invalido');
    }
    const lookup = await db
        .collectionGroup('appointments')
        .where('reschedulingToken', '==', token)
        .limit(1)
        .get();
    if (lookup.empty) {
        throw new functions.https.HttpsError('not-found', 'Agendamento nao encontrado para o token');
    }
    const appointmentDoc = lookup.docs[0];
    const appointmentData = appointmentDoc.data();
    const userId = appointmentDoc.ref.parent.parent?.id;
    if (!userId) {
        throw new functions.https.HttpsError('internal', 'Estrutura do agendamento invalida');
    }
    const expiresAt = appointmentData.reschedulingExpiresAt;
    if (!expiresAt || expiresAt.toDate().getTime() < Date.now()) {
        throw new functions.https.HttpsError('failed-precondition', 'Link de reagendamento expirado');
    }
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(newDate.getTime())) {
        throw new functions.https.HttpsError('invalid-argument', 'Data invalida');
    }
    const startTime = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), hours, minutes, 0, 0);
    const duration = typeof appointmentData.duration === 'number' && appointmentData.duration > 0
        ? appointmentData.duration
        : 60;
    const endTime = new Date(startTime.getTime() + duration * 60000);
    const settingsDoc = await db
        .collection('users')
        .doc(userId)
        .collection('settings')
        .doc('business')
        .get();
    const schedule = settingsDoc.exists ? (settingsDoc.data()?.schedule ?? null) : null;
    const dayKey = DAYS_PT[startTime.getDay()];
    const daySchedule = schedule?.[dayKey];
    if (daySchedule?.enabled === false) {
        throw new functions.https.HttpsError('failed-precondition', 'Dia indisponivel para agendamentos.');
    }
    const openMin = parseTimeToMinutes(daySchedule?.open ?? '08:00', 8 * 60);
    const closeMin = parseTimeToMinutes(daySchedule?.close ?? '18:00', 18 * 60);
    const startMin = hours * 60 + minutes;
    if (startMin < openMin || startMin + duration > closeMin) {
        throw new functions.https.HttpsError('failed-precondition', 'Horario fora do expediente.');
    }
    const startOfDay = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 23, 59, 59, 999);
    const sameDayAppointments = await db
        .collection('users')
        .doc(userId)
        .collection('appointments')
        .where('date', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('date', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .get();
    const hasConflict = sameDayAppointments.docs.some((doc) => {
        if (doc.id === appointmentDoc.id)
            return false;
        const current = doc.data();
        if (current.status === 'cancelado')
            return false;
        const currentStart = current.date?.toDate();
        if (!currentStart)
            return false;
        const currentEndField = current.endTime;
        const currentDuration = typeof current.duration === 'number' && current.duration > 0 ? current.duration : 60;
        const currentEnd = currentEndField
            ? currentEndField.toDate()
            : new Date(currentStart.getTime() + currentDuration * 60000);
        return startTime < currentEnd && endTime > currentStart;
    });
    if (hasConflict) {
        throw new functions.https.HttpsError('failed-precondition', 'Horario indisponivel. Escolha outro horario.');
    }
    await appointmentDoc.ref.update({
        date: admin.firestore.Timestamp.fromDate(startTime),
        time,
        endTime: admin.firestore.Timestamp.fromDate(endTime),
        status: 'agendado',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
