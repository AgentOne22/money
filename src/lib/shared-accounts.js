/**
 * Shared Accounts: Gemeinsame Konten für Paare & Familien
 * 
 * Ermöglicht die Verwaltung geteilter Konten mit mehreren Mitgliedern,
 * Rollenverwaltung und Berechtigungen.
 */

export const MEMBER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
};

export const SHARED_ACCOUNT_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  ARCHIVED: 'archived',
  DISSOLVED: 'dissolved'
};

export const PERMISSIONS = {
  VIEW_TRANSACTIONS: 'view_transactions',
  ADD_TRANSACTIONS: 'add_transactions',
  EDIT_TRANSACTIONS: 'edit_transactions',
  DELETE_TRANSACTIONS: 'delete_transactions',
  MANAGE_MEMBERS: 'manage_members',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data'
};

const ROLE_PERMISSIONS = {
  [MEMBER_ROLE.OWNER]: Object.values(PERMISSIONS),
  [MEMBER_ROLE.ADMIN]: [
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.ADD_TRANSACTIONS,
    PERMISSIONS.EDIT_TRANSACTIONS,
    PERMISSIONS.DELETE_TRANSACTIONS,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_DATA
  ],
  [MEMBER_ROLE.MEMBER]: [
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.ADD_TRANSACTIONS,
    PERMISSIONS.VIEW_REPORTS
  ],
  [MEMBER_ROLE.VIEWER]: [
    PERMISSIONS.VIEW_TRANSACTIONS
  ]
};

/**
 * Erstellt ein gemeinsames Konto
 */
export function createSharedAccount({
  id = null,
  name = '',
  description = '',
  currency = 'EUR',
  createdBy = null,
  members = [],
  settings = {},
  tags = []
} = {}) {
  return {
    id: id || `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    currency,
    status: SHARED_ACCOUNT_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy,
    members: members.length > 0 ? members : (createdBy ? [{
      userId: createdBy,
      role: MEMBER_ROLE.OWNER,
      joinedAt: new Date().toISOString(),
      status: 'active'
    }] : []),
    settings: {
      autoCategorize: true,
      allowMemberInvite: true,
      trackSplitwise: false,
      splitwiseGroupId: null,
      splitBy: 'equal', // 'equal', 'percentage', 'custom'
      showMemberNames: true,
      ...settings
    },
    tags,
    transactionCount: 0,
    totalExpenses: 0,
    totalIncome: 0
  };
}

/**
 * Fügt ein Mitglied zum gemeinsamen Konto hinzu
 */
export function addMember(account, userId, role = MEMBER_ROLE.MEMBER, invitedBy = null) {
  if (!account || !userId) {
    throw new Error('Account und userId sind erforderlich');
  }
  
  if (account.members.some(m => m.userId === userId)) {
    throw new Error('Benutzer ist bereits Mitglied');
  }
  
  const newMember = {
    userId,
    role,
    joinedAt: new Date().toISOString(),
    status: 'active',
    invitedBy
  };
  
  return {
    ...account,
    members: [...account.members, newMember],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Entfernt ein Mitglied aus dem gemeinsamen Konto
 */
export function removeMember(account, userId) {
  if (!account || !userId) {
    throw new Error('Account und userId sind erforderlich');
  }
  
  const memberIndex = account.members.findIndex(m => m.userId === userId);
  if (memberIndex === -1) {
    throw new Error('Benutzer ist kein Mitglied');
  }
  
  const member = account.members[memberIndex];
  if (member.role === MEMBER_ROLE.OWNER) {
    throw new Error('Der Besitzer kann nicht entfernt werden');
  }
  
  return {
    ...account,
    members: account.members.filter(m => m.userId !== userId),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Ändert die Rolle eines Mitglieds
 */
export function updateMemberRole(account, userId, newRole) {
  if (!account || !userId || !newRole) {
    throw new Error('Account, userId und newRole sind erforderlich');
  }
  
  const memberIndex = account.members.findIndex(m => m.userId === userId);
  if (memberIndex === -1) {
    throw new Error('Benutzer ist kein Mitglied');
  }
  
  const member = account.members[memberIndex];
  if (member.role === MEMBER_ROLE.OWNER && newRole !== MEMBER_ROLE.OWNER) {
    // Prüfe ob es noch einen anderen Owner gibt
    const otherOwners = account.members.filter(m => m.role === MEMBER_ROLE.OWNER && m.userId !== userId);
    if (otherOwners.length === 0) {
      throw new Error('Mindestens ein Besitzer muss vorhanden bleiben');
    }
  }
  
  const updatedMembers = [...account.members];
  updatedMembers[memberIndex] = { ...member, role: newRole };
  
  return {
    ...account,
    members: updatedMembers,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Prüft ob ein Mitglied eine bestimmte Berechtigung hat
 */
export function hasPermission(account, userId, permission) {
  if (!account || !userId || !permission) return false;
  
  const member = account.members.find(m => m.userId === userId);
  if (!member || member.status !== 'active') return false;
  
  const permissions = ROLE_PERMISSIONS[member.role] || [];
  return permissions.includes(permission);
}

/**
 * Gibt alle Berechtigungen für eine Rolle zurück
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Gibt alle Mitglieder einer bestimmten Rolle zurück
 */
export function getMembersByRole(account, role) {
  if (!account || !role) return [];
  return account.members.filter(m => m.role === role);
}

/**
 * Berechnet die Aufteilung einer Transaktion
 */
export function splitTransaction(transaction, account, splitConfig = null) {
  if (!transaction || !account) {
    throw new Error('Transaction und Account sind erforderlich');
  }
  
  const activeMembers = account.members.filter(m => m.status === 'active');
  const memberCount = activeMembers.length;
  
  if (memberCount === 0) {
    throw new Error('Keine aktiven Mitglieder im Konto');
  }
  
  const config = splitConfig || { method: account.settings.splitBy || 'equal' };
  
  switch (config.method) {
    case 'equal':
      return splitEqually(transaction, activeMembers);
    case 'percentage':
      return splitByPercentage(transaction, activeMembers, config.percentages || {});
    case 'custom':
      return splitByCustom(transaction, activeMembers, config.shares || {});
    default:
      return splitEqually(transaction, activeMembers);
  }
}

/**
 * Gleichmäßige Aufteilung
 */
function splitEqually(transaction, members) {
  const share = Math.round((transaction.amount / members.length) * 100) / 100;
  const remainder = Math.round((transaction.amount - share * members.length) * 100) / 100;
  
  return {
    method: 'equal',
    total: transaction.amount,
    shares: members.map((m, i) => ({
      userId: m.userId,
      amount: i === 0 ? share + remainder : share,
      percentage: Math.round((1 / members.length) * 10000) / 100
    }))
  };
}

/**
 * Prozentuale Aufteilung
 */
function splitByPercentage(transaction, members, percentages) {
  const shares = members.map(m => {
    const percentage = percentages[m.userId] || (100 / members.length);
    const amount = Math.round(transaction.amount * (percentage / 100) * 100) / 100;
    return {
      userId: m.userId,
      amount,
      percentage
    };
  });
  
  // Rundungsfehler ausgleichen
  const total = shares.reduce((sum, s) => sum + s.amount, 0);
  const diff = Math.round((transaction.amount - total) * 100) / 100;
  if (diff !== 0 && shares.length > 0) {
    shares[0].amount = Math.round((shares[0].amount + diff) * 100) / 100;
  }
  
  return {
    method: 'percentage',
    total: transaction.amount,
    shares
  };
}

/**
 * Benutzerdefinierte Aufteilung
 */
function splitByCustom(transaction, members, customShares) {
  const shares = members.map(m => {
    const amount = customShares[m.userId] || 0;
    return {
      userId: m.userId,
      amount,
      percentage: transaction.amount !== 0 ? Math.round((amount / transaction.amount) * 10000) / 100 : 0
    };
  });
  
  return {
    method: 'custom',
    total: transaction.amount,
    shares
  };
}

/**
 * Generiert eine Zusammenfassung des gemeinsamen Kontos
 */
export function getSharedAccountSummary(account, transactions = []) {
  if (!account) return null;
  
  const sharedTransactions = transactions.filter(t => t.sharedAccountId === account.id);
  
  let totalExpenses = 0;
  let totalIncome = 0;
  const byCategory = {};
  const byMember = {};
  
  for (const t of sharedTransactions) {
    if (t.amount < 0) {
      totalExpenses += Math.abs(t.amount);
      byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount);
    } else {
      totalIncome += t.amount;
    }
    
    if (t.createdBy) {
      byMember[t.createdBy] = (byMember[t.createdBy] || 0) + t.amount;
    }
  }
  
  return {
    accountId: account.id,
    accountName: account.name,
    currency: account.currency,
    memberCount: account.members.filter(m => m.status === 'active').length,
    transactionCount: sharedTransactions.length,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    balance: Math.round((totalIncome - totalExpenses) * 100) / 100,
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
    byMember: Object.fromEntries(
      Object.entries(byMember).map(([k, v]) => [k, Math.round(v * 100) / 100])
    )
  };
}

/**
 * Erstellt einen Einladungslink/Code
 */
export function generateInvite(account, createdBy, expiresInHours = 48) {
  if (!account || !createdBy) {
    throw new Error('Account und createdBy sind erforderlich');
  }
  
  return {
    code: Math.random().toString(36).substr(2, 8).toUpperCase(),
    accountId: account.id,
    createdBy,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
    maxUses: 1,
    usedCount: 0,
    status: 'active'
  };
}

/**
 * Berechnet die Balance zwischen Mitgliedern (wer schuldet wem)
 */
export function calculateMemberBalances(account, transactions = []) {
  if (!account || !transactions.length) return [];
  
  const sharedTx = transactions.filter(t => t.sharedAccountId === account.id);
  const activeMembers = account.members.filter(m => m.status === 'active');
  const balances = {};
  
  // Initialisiere Balances
  for (const m of activeMembers) {
    balances[m.userId] = 0;
  }
  
  // Berechne wer was bezahlt hat und wer seinen Anteil schuldet
  for (const t of sharedTx) {
    const split = t._split || splitTransaction(t, account);
    
    // Der Bezahler bekommt den vollen Betrag gutgeschrieben
    if (balances[t.createdBy] !== undefined) {
      balances[t.createdBy] += t.amount;
    }
    
    // Jeder schuldet seinen Anteil
    for (const share of split.shares) {
      if (balances[share.userId] !== undefined) {
        balances[share.userId] -= share.amount;
      }
    }
  }
  
  // Konvertiere in Array und runde
  return Object.entries(balances).map(([userId, balance]) => ({
    userId,
    balance: Math.round(balance * 100) / 100,
    status: balance > 0.01 ? 'owed' : balance < -0.01 ? 'owes' : 'settled'
  }));
}
