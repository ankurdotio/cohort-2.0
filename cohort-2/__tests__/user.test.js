import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/user.model.js';

let mongoServer;

export const connect = async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
};

export const disconnect = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
};

export const clearCollections = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[ key ].deleteMany({});
    }
};

beforeAll(async () => await connect());
afterAll(async () => await disconnect());

afterEach(async () => await clearCollections());


describe('User Model Test', () => {
    it('should create & save user successfully', async () => {
        const validUser = new User({ name: 'John Doe', email: 'john.doe@example.com' });
        const savedUser = await validUser.save();
        expect(savedUser.name).toBe('John Doe');
        expect(savedUser.email).toBe('john.doe@example.com');
    });

    it('should fail to create user without required fields', async () => {
        const userWithoutRequiredField = new User({ name: 'Jane Doe' });
        let err;
        try {
            await userWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });
});