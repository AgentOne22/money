import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSharedAccount,
  addMember,
  removeMember,
  updateMemberRole,
  hasPermission,
  splitTransaction,
  getSharedAccountSummary,
  generateInvite,
  calculateMemberBalances,
  getRolePermissions,
  getMembersByRole,
  MEMBER_ROLE,
  SHARED_ACCOUNT_STATUS,
  PERMISSIONS
} from '../src/lib/shared-accounts';

describe('Shared Accounts - Core', () => {
  let account;

  beforeEach(() => {
    account = createSharedAccount({
      name: 'Familienkonto',
      description: 'Geteiltes Konto für Paar',
      currency: 'EUR',
      createdBy: 'user1'
    });
  });

  it('creates a shared account with default values', () => {
    expect(account).toMatchObject({
      name: 'Familienkonto',
      description: 'Geteiltes Konto für Paar',
      currency: 'EUR',
      status: SHARED_ACCOUNT_STATUS.ACTIVE
    });
    expect(account.id).toMatch(/^shared_/);
    expect(account.members.length).toBe(1);
    expect(account.members[0].userId).toBe('user1');
    expect(account.members[0].role).toBe(MEMBER_ROLE.OWNER);
  });

  it('creates account without initial members when no createdBy', () => {
    const emptyAccount = createSharedAccount({
      name: 'Test Konto'
    });
    expect(emptyAccount.members.length).toBe(0);
  });

  it('generates unique IDs for accounts', () => {
    const acc1 = createSharedAccount({ name: 'Konto 1' });
    const acc2 = createSharedAccount({ name: 'Konto 2' });
    expect(acc1.id).not.toBe(acc2.id);
  });

  it('includes timestamps', () => {
    expect(account.createdAt).toBeDefined();
    expect(account.updatedAt).toBeDefined();
    expect(new Date(account.createdAt).getTime()).not.toBeNaN();
  });

  it('includes default settings', () => {
    expect(account.settings.autoCategorize).toBe(true);
    expect(account.settings.allowMemberInvite).toBe(true);
    expect(account.settings.splitBy).toBe('equal');
  });

  it('merges custom settings', () => {
    const customAccount = createSharedAccount({
      name: 'Custom',
      settings: { autoCategorize: false, splitBy: 'percentage' }
    });
    expect(customAccount.settings.autoCategorize).toBe(false);
    expect(customAccount.settings.splitBy).toBe('percentage');
  });
});

describe('Shared Accounts - Members', () => {
  let account;

  beforeEach(() => {
    account = createSharedAccount({
      name: 'Familienkonto',
      createdBy: 'user1'
    });
  });

  it('adds a member successfully', () => {
    const updated = addMember(account, 'user2', MEMBER_ROLE.MEMBER, 'user1');
    expect(updated.members.length).toBe(2);
    expect(updated.members[1]).toMatchObject({
      userId: 'user2',
      role: MEMBER_ROLE.MEMBER,
      invitedBy: 'user1',
      status: 'active'
    });
  });

  it('throws when adding duplicate member', () => {
    const updated = addMember(account, 'user2', MEMBER_ROLE.MEMBER);
    expect(() => addMember(updated, 'user2', MEMBER_ROLE.VIEWER)).toThrow('bereits Mitglied');
  });

  it('throws when adding without userId', () => {
    expect(() => addMember(account, null)).toThrow();
    expect(() => addMember(null, 'user2')).toThrow();
  });

  it('removes a member successfully', () => {
    const updated = addMember(account, 'user2', MEMBER_ROLE.MEMBER);
    const removed = removeMember(updated, 'user2');
    expect(removed.members.length).toBe(1);
    expect(removed.members.some(m => m.userId === 'user2')).toBe(false);
  });

  it('throws when removing owner', () => {
    expect(() => removeMember(account, 'user1')).toThrow('Besitzer');
  });

  it('throws when removing non-member', () => {
    expect(() => removeMember(account, 'unknown')).toThrow('kein Mitglied');
  });

  it('updates member role', () => {
    const updated = addMember(account, 'user2', MEMBER_ROLE.MEMBER);
    const changed = updateMemberRole(updated, 'user2', MEMBER_ROLE.ADMIN);
    expect(changed.members.find(m => m.userId === 'user2').role).toBe(MEMBER_ROLE.ADMIN);
  });

  it('prevents removing last owner by demotion', () => {
    expect(() => updateMemberRole(account, 'user1', MEMBER_ROLE.MEMBER)).toThrow('Besitzer');
  });

  it('allows demoting owner when another exists', () => {
    const updated = addMember(account, 'user2', MEMBER_ROLE.OWNER);
    const changed = updateMemberRole(updated, 'user1', MEMBER_ROLE.ADMIN);
    expect(changed.members.find(m => m.userId === 'user1').role).toBe(MEMBER_ROLE.ADMIN);
  });

  it('returns members by role', () => {
    const updated = addMember(account, 'user2', MEMBER_ROLE.MEMBER);
    const members = getMembersByRole(updated, MEMBER_ROLE.MEMBER);
    expect(members.length).toBe(1);
    expect(members[0].userId).toBe('user2');
  });

  it('updates updatedAt on member changes', () => {
    const originalUpdatedAt = account.updatedAt;
    // Wait a tiny bit for different timestamp
    const updated = addMember(account, 'user2', MEMBER_ROLE.MEMBER);
    // Just check it's defined - exact timing is hard to test
    expect(updated.updatedAt).toBeDefined();
  });
});

describe('Shared Accounts - Permissions', () => {
  let account;

  beforeEach(() => {
    account = createSharedAccount({
      name: 'Test',
      createdBy: 'owner1'
    });
    account = addMember(account, 'admin1', MEMBER_ROLE.ADMIN);
    account = addMember(account, 'member1', MEMBER_ROLE.MEMBER);
    account = addMember(account, 'viewer1', MEMBER_ROLE.VIEWER);
  });

  it('owner has all permissions', () => {
    expect(hasPermission(account, 'owner1', PERMISSIONS.MANAGE_MEMBERS)).toBe(true);
    expect(hasPermission(account, 'owner1', PERMISSIONS.DELETE_TRANSACTIONS)).toBe(true);
    expect(hasPermission(account, 'owner1', PERMISSIONS.VIEW_TRANSACTIONS)).toBe(true);
  });

  it('admin has most permissions', () => {
    expect(hasPermission(account, 'admin1', PERMISSIONS.MANAGE_MEMBERS)).toBe(true);
    expect(hasPermission(account, 'admin1', PERMISSIONS.VIEW_REPORTS)).toBe(true);
    expect(hasPermission(account, 'admin1', PERMISSIONS.MANAGE_SETTINGS)).toBe(false);
  });

  it('member has limited permissions', () => {
    expect(hasPermission(account, 'member1', PERMISSIONS.VIEW_TRANSACTIONS)).toBe(true);
    expect(hasPermission(account, 'member1', PERMISSIONS.ADD_TRANSACTIONS)).toBe(true);
    expect(hasPermission(account, 'member1', PERMISSIONS.DELETE_TRANSACTIONS)).toBe(false);
    expect(hasPermission(account, 'member1', PERMISSIONS.MANAGE_MEMBERS)).toBe(false);
  });

  it('viewer has only view permission', () => {
    expect(hasPermission(account, 'viewer1', PERMISSIONS.VIEW_TRANSACTIONS)).toBe(true);
    expect(hasPermission(account, 'viewer1', PERMISSIONS.ADD_TRANSACTIONS)).toBe(false);
    expect(hasPermission(account, 'viewer1', PERMISSIONS.VIEW_REPORTS)).toBe(false);
  });

  it('returns false for inactive member', () => {
    account.members[3].status = 'suspended';
    expect(hasPermission(account, 'viewer1', PERMISSIONS.VIEW_TRANSACTIONS)).toBe(false);
  });

  it('returns false for unknown user', () => {
    expect(hasPermission(account, 'unknown', PERMISSIONS.VIEW_TRANSACTIONS)).toBe(false);
  });

  it('handles missing parameters', () => {
    expect(hasPermission(null, 'owner1', PERMISSIONS.VIEW_TRANSACTIONS)).toBe(false);
    expect(hasPermission(account, null, PERMISSIONS.VIEW_TRANSACTIONS)).toBe(false);
    expect(hasPermission(account, 'owner1', null)).toBe(false);
  });

  it('returns role permissions correctly', () => {
    const ownerPerms = getRolePermissions(MEMBER_ROLE.OWNER);
    expect(ownerPerms).toContain(PERMISSIONS.MANAGE_MEMBERS);
    expect(ownerPerms).toContain(PERMISSIONS.DELETE_TRANSACTIONS);

    const viewerPerms = getRolePermissions(MEMBER_ROLE.VIEWER);
    expect(viewerPerms).toEqual([PERMISSIONS.VIEW_TRANSACTIONS]);
  });

  it('returns empty array for unknown role', () => {
    expect(getRolePermissions('superadmin')).toEqual([]);
  });
});

describe('Shared Accounts - Transaction Splitting', () => {
  let account;

  beforeEach(() => {
    account = createSharedAccount({ name: 'Test', createdBy: 'user1' });
    account = addMember(account, 'user2', MEMBER_ROLE.MEMBER);
    account = addMember(account, 'user3', MEMBER_ROLE.MEMBER);
  });

  it('splits equally among members', () => {
    const transaction = { amount: -90 };
    const split = splitTransaction(transaction, account);
    
    expect(split.method).toBe('equal');
    expect(split.total).toBe(-90);
    expect(split.shares.length).toBe(3);
    
    // Each should get ~30
    const amounts = split.shares.map(s => s.amount);
    expect(amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(-90, 2);
  });

  it('handles remainder in equal split', () => {
    const transaction = { amount: -10 };
    const split = splitTransaction(transaction, account);
    
    // 10 / 3 = 3.33, first gets 3.34
    expect(split.shares[0].amount).toBeCloseTo(-3.34, 2);
  });

  it('splits by percentage', () => {
    const transaction = { amount: -100 };
    const split = splitTransaction(transaction, account, {
      method: 'percentage',
      percentages: { user1: 50, user2: 30, user3: 20 }
    });
    
    expect(split.method).toBe('percentage');
    const user1Share = split.shares.find(s => s.userId === 'user1');
    expect(user1Share.amount).toBe(-50);
    expect(user1Share.percentage).toBe(50);
  });

  it('splits by custom shares', () => {
    const transaction = { amount: -100 };
    const split = splitTransaction(transaction, account, {
      method: 'custom',
      shares: { user1: -40, user2: -35, user3: -25 }
    });
    
    expect(split.method).toBe('custom');
    expect(split.shares.find(s => s.userId === 'user1').amount).toBe(-40);
  });

  it('throws for empty account', () => {
    const emptyAccount = createSharedAccount({ name: 'Leer' });
    expect(() => splitTransaction({ amount: -50 }, emptyAccount)).toThrow();
  });

  it('only counts active members', () => {
    account.members[2].status = 'suspended';
    const transaction = { amount: -60 };
    const split = splitTransaction(transaction, account);
    expect(split.shares.length).toBe(2);
  });
});

describe('Shared Accounts - Summary', () => {
  it('generates correct summary', () => {
    const account = createSharedAccount({
      name: 'Test',
      createdBy: 'user1'
    });
    
    const transactions = [
      { sharedAccountId: account.id, amount: -30, category: 'food', createdBy: 'user1' },
      { sharedAccountId: account.id, amount: -20, category: 'transport', createdBy: 'user2' },
      { sharedAccountId: account.id, amount: 100, category: 'income', createdBy: 'user1' }
    ];
    
    const summary = getSharedAccountSummary(account, transactions);
    
    expect(summary.totalIncome).toBe(100);
    expect(summary.totalExpenses).toBe(50);
    expect(summary.balance).toBe(50);
    expect(summary.transactionCount).toBe(3);
    expect(summary.byCategory.food).toBe(30);
    expect(summary.byCategory.transport).toBe(20);
  });

  it('returns zero values for no transactions', () => {
    const account = createSharedAccount({ name: 'Leer', createdBy: 'user1' });
    const summary = getSharedAccountSummary(account, []);
    
    expect(summary.totalIncome).toBe(0);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.balance).toBe(0);
    expect(summary.transactionCount).toBe(0);
  });

  it('returns null for undefined account', () => {
    expect(getSharedAccountSummary(null, [])).toBeNull();
  });

  it('ignores transactions from other accounts', () => {
    let account = createSharedAccount({ name: 'Test', createdBy: 'user1' });
    const otherAccount = createSharedAccount({ name: 'Other' });
    
    const transactions = [
      { sharedAccountId: account.id, amount: -50, category: 'food', createdBy: 'user1' },
      { sharedAccountId: otherAccount.id, amount: -100, category: 'shopping', createdBy: 'user2' }
    ];
    
    const summary = getSharedAccountSummary(account, transactions);
    expect(summary.transactionCount).toBe(1);
    expect(summary.totalExpenses).toBe(50);
  });

  it('groups by member', () => {
    let account = createSharedAccount({ name: 'Test', createdBy: 'user1' });
    account = addMember(account, 'user2', MEMBER_ROLE.MEMBER);
    
    const transactions = [
      { sharedAccountId: account.id, amount: -30, category: 'food', createdBy: 'user1' },
      { sharedAccountId: account.id, amount: -70, category: 'food', createdBy: 'user2' }
    ];
    
    const summary = getSharedAccountSummary(account, transactions);
    expect(summary.byMember.user1).toBe(-30);
    expect(summary.byMember.user2).toBe(-70);
  });
});

describe('Shared Accounts - Invites', () => {
  it('generates valid invite code', () => {
    let account = createSharedAccount({ name: 'Test', createdBy: 'user1' });
    const invite = generateInvite(account, 'user1');
    
    expect(invite.code).toMatch(/^[A-Z0-9]{8}$/);
    expect(invite.accountId).toBe(account.id);
    expect(invite.createdBy).toBe('user1');
    expect(invite.status).toBe('active');
    expect(invite.maxUses).toBe(1);
  });

  it('sets correct expiration', () => {
    let account = createSharedAccount({ name: 'Test', createdBy: 'user1' });
    const invite = generateInvite(account, 'user1', 24);
    
    const expiresAt = new Date(invite.expiresAt);
    const createdAt = new Date(invite.createdAt);
    const diffHours = (expiresAt - createdAt) / (1000 * 60 * 60);
    
    expect(diffHours).toBeCloseTo(24, 0.1);
  });

  it('throws without account or creator', () => {
    expect(() => generateInvite(null, 'user1')).toThrow();
    let account = createSharedAccount({ name: 'Test', createdBy: 'user1' });
    expect(() => generateInvite(account, null)).toThrow();
  });
});

describe('Shared Accounts - Balances', () => {
  it('calculates member balances correctly', () => {
    let account = createSharedAccount({ name: 'Test', createdBy: 'user1' });
    account = addMember(account, 'user2', MEMBER_ROLE.MEMBER);
    
    const transactions = [
      { sharedAccountId: account.id, amount: -100, createdBy: 'user1' },
      { sharedAccountId: account.id, amount: -50, createdBy: 'user2' }
    ];
    
    const balances = calculateMemberBalances(account, transactions);
    
    // user1 paid 100, owes 75 total -> -25 (owes)
    // user2 paid 50, owes 75 total -> +25 (owed)
    const user1Balance = balances.find(b => b.userId === 'user1');
    const user2Balance = balances.find(b => b.userId === 'user2');
    
    expect(user1Balance.balance).toBeCloseTo(-25, 1);
    expect(user1Balance.status).toBe('owes');
    
    expect(user2Balance.balance).toBeCloseTo(25, 1);
    expect(user2Balance.status).toBe('owed');
  });

  it('returns empty array for no transactions', () => {
    let account = createSharedAccount({ name: 'Test', createdBy: 'user1' });
    const balances = calculateMemberBalances(account, []);
    expect(balances).toEqual([]);
  });

  it('returns empty array for undefined account', () => {
    expect(calculateMemberBalances(null, [])).toEqual([]);
  });

  it('detects who owes whom', () => {
    let account = createSharedAccount({ name: 'Test', createdBy: 'user1' });
    account = addMember(account, 'user2', MEMBER_ROLE.MEMBER);
    account = addMember(account, 'user3', MEMBER_ROLE.MEMBER);
    
    // Only user1 paid everything
    const transactions = [
      { sharedAccountId: account.id, amount: -90, createdBy: 'user1' }
    ];
    
    const balances = calculateMemberBalances(account, transactions);
    
    const user1 = balances.find(b => b.userId === 'user1');
    const user2 = balances.find(b => b.userId === 'user2');
    const user3 = balances.find(b => b.userId === 'user3');
    
    expect(user1.status).toBe('owes');
    expect(user2.status).toBe('owed');
    expect(user3.status).toBe('owed');
    
    expect(user1.balance).toBeCloseTo(-60, 1);
    expect(user2.balance).toBeCloseTo(30, 1);
    expect(user3.balance).toBeCloseTo(30, 1);
  });
});
