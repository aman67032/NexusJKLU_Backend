export const canCreateUsers = (role) => {
    return ['super_admin', 'admin', 'head_student_affairs', 'executive_student_affairs'].includes(role);
};

export const canAssignRoles = (role) => {
    return ['super_admin', 'admin'].includes(role);
};

export const canManageCouncils = (role) => {
    return ['super_admin', 'admin', 'head_student_affairs', 'executive_student_affairs'].includes(role);
};

export const canManageClubs = (role) => {
    return ['super_admin', 'admin', 'head_student_affairs', 'executive_student_affairs', 'council_admin', 'council_president'].includes(role);
};

export const canCreateEvents = (role) => {
    return ['super_admin', 'admin', 'head_student_affairs', 'executive_student_affairs', 'council_president', 'council_admin', 'club_chair', 'club_co_chair', 'club_secretary', 'club_general_secretary'].includes(role);
};

export const canApproveEvents = (role) => {
    return ['super_admin', 'admin', 'head_student_affairs', 'executive_student_affairs', 'council_president', 'council_admin'].includes(role);
};

export const canMarkAttendance = (role) => {
    return ['super_admin', 'admin', 'head_student_affairs', 'executive_student_affairs', 'council_admin', 'club_chair', 'club_co_chair', 'club_secretary', 'club_general_secretary'].includes(role);
};

export const canGenerateCertificates = (role) => {
    return ['super_admin', 'admin', 'head_student_affairs', 'executive_student_affairs', 'council_admin'].includes(role);
};

export const canRevokeCertificates = (role) => {
    return ['super_admin', 'admin', 'head_student_affairs', 'executive_student_affairs'].includes(role);
};

export const canViewAnalytics = (role) => {
    return ['super_admin', 'admin', 'head_student_affairs', 'executive_student_affairs', 'council_president', 'council_admin', 'club_chair', 'club_co_chair', 'club_secretary', 'club_general_secretary'].includes(role);
};

export const canManageLearnPortal = (role) => {
    return ['super_admin', 'admin', 'learn_admin', 'coding_ta'].includes(role);
};

export const canManageVoicePortal = (role) => {
    return ['super_admin', 'admin', 'voice_admin'].includes(role);
};
