import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password?: string;
  displayName: string;
  partnerCode: string;
  partnerId: Schema.Types.ObjectId | IUser | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    partnerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Remove password before sending to client
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);
