import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { BillHead, Confidence, FactKey, FactSource, FactStatus, Verification } from '@claimsense/shared';

// Every owned collection has userId and an expiresAt TTL index (docs/architecture.md, retention).
const ttl = { type: Date, required: true, index: { expireAfterSeconds: 0 } } as const;
const owner = { type: Schema.Types.ObjectId, required: true, index: true } as const;

// Reuse a compiled model across hot reloads.
function model<S extends Schema>(name: string, schema: S): Model<InferSchemaType<S>> {
  return (mongoose.models[name] ?? mongoose.model(name, schema)) as Model<InferSchemaType<S>>;
}

const userSchema = new Schema(
  {
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    passwordHash: { type: String },
    displayName: { type: String },
    isGuest: { type: Boolean, required: true, default: false },
    adultAttested: { type: Boolean, required: true, default: false },
    // Guests expire; signed-up users keep no expiry until they delete themselves.
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);
export const User = model('User', userSchema);

const sessionSchema = new Schema({ tokenHash: { type: String, required: true, unique: true }, userId: owner, expiresAt: ttl });
export const Session = model('Session', sessionSchema);

const loginAttemptSchema = new Schema({ emailHash: { type: String, required: true, index: true }, expiresAt: ttl });
export const LoginAttempt = model('LoginAttempt', loginAttemptSchema);

const sampleStartSchema = new Schema({ ipHash: { type: String, required: true, index: true }, expiresAt: ttl });
export const SampleStart = model('SampleStart', sampleStartSchema);

const claimSchema = new Schema(
  {
    userId: owner,
    planId: { type: String, required: true },
    subject: { relation: { type: String, required: true }, treatment: { type: String, required: true } },
    consent: { analysis: Boolean, retention: Boolean, improve: Boolean },
    sampleCaseId: { type: String },
    documentCount: { type: Number, required: true, default: 0 },
    factsVersion: { type: Number, required: true, default: 0 },
    expiresAt: ttl,
  },
  { timestamps: true },
);
export const Claim = model('Claim', claimSchema);

const factSchema = new Schema(
  {
    userId: owner,
    claimId: { type: Schema.Types.ObjectId, required: true, index: true },
    key: { type: String, enum: FactKey.options, required: true },
    head: { type: String, enum: BillHead.options, required: true },
    value: { type: Schema.Types.Mixed, default: null },
    status: { type: String, enum: FactStatus.options, required: true },
    source: { type: String, enum: FactSource.options, required: true },
    documentId: { type: String, default: null },
    sourceQuote: { type: String, default: null },
    page: { type: Number, default: null },
    confidence: { type: String, enum: Confidence.options, required: true },
    verification: { type: String, enum: Verification.options, required: true },
    confirmedByUser: { type: Boolean, required: true, default: false },
    expiresAt: ttl,
  },
  { timestamps: true, minimize: false },
);
export const FactModel = model('Fact', factSchema);

const estimateSchema = new Schema(
  {
    userId: owner,
    claimId: { type: Schema.Types.ObjectId, required: true, index: true },
    estimate: { type: Schema.Types.Mixed, required: true },
    expiresAt: ttl,
  },
  { timestamps: true },
);
export const EstimateModel = model('Estimate', estimateSchema);

const usageSchema = new Schema({ userId: owner, day: { type: String, required: true }, count: { type: Number, default: 0 }, expiresAt: ttl });
usageSchema.index({ userId: 1, day: 1 }, { unique: true });
export const ExtractionUsage = model('ExtractionUsage', usageSchema);
