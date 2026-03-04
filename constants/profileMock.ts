export type ProfileMock = {
  name: string;
  maskedId: string;
  verified: boolean;
  trustScore: number;
  memberSince: number;
};

export type LinkedMock = {
  idsCount: number;
  banksCount: number;
  documentsCount: number;
};

export type SecurityMock = {
  biometricsEnabled: boolean;
  twoFactorEnabled: boolean;
  recoveryEmail: string | null;
  recoveryPhone: string | null;
};

export type SessionMock = {
  device: string;
  os: string;
  location: string;
  lastActive: string;
};

export const profile: ProfileMock = {
  name: "User",
  maskedId: "********4614",
  verified: true,
  trustScore: 85,
  memberSince: 2026,
};

export const linked: LinkedMock = {
  idsCount: 2,
  banksCount: 1,
  documentsCount: 3,
};

export const security: SecurityMock = {
  biometricsEnabled: false,
  twoFactorEnabled: false,
  recoveryEmail: "recovery@lockdigit.app",
  recoveryPhone: null,
};

export const sessions: SessionMock[] = [
  {
    device: "iPhone 15 Pro",
    os: "iOS 17",
    location: "Dallas, TX",
    lastActive: "Now",
  },
  {
    device: "MacBook Pro",
    os: "macOS",
    location: "Dallas, TX",
    lastActive: "2h ago",
  },
  {
    device: "iPad Air",
    os: "iPadOS",
    location: "Austin, TX",
    lastActive: "Yesterday",
  },
];

