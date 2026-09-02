/**
 * Board roster. Names and roles carried forward from the previous site.
 * Bios are being written by the team and drop in as the `bio` string.
 * A member with `bio: null` renders the "Bio coming soon." empty state.
 * TODO(board): confirm names and roles with the team; add bios when supplied.
 */
export type Member = {
  readonly name: string;
  readonly role: string;
  readonly bio: string | null;
};

export const members: readonly Member[] = [
  { name: 'Mahendra Kodilkar', role: 'Founder & Executive Director', bio: null },
  { name: 'Priya Raghavan', role: 'Vice President', bio: null },
  { name: 'Daniel Osei', role: 'Treasurer', bio: null },
  { name: 'Hannah Cho', role: 'Secretary', bio: null },
  { name: 'Marcus Whitfield', role: 'Director of Programs', bio: null },
  { name: 'Elena Vasquez', role: 'Director of Outreach', bio: null },
  { name: 'Tomás Rivera', role: 'Director of Curriculum', bio: null },
  { name: 'Aisha Rahman', role: 'Director of Partnerships', bio: null },
  { name: 'Grace Liu', role: 'Volunteer Coordinator', bio: null },
  { name: 'Ethan Brooks', role: 'Technology Lead', bio: null },
];
