import prisma from "./prisma.client.js";

const connectDB = async() => {
  try{
    await prisma.$connect();
  } catch (error : unknown){
    const err = error as Error;
    console.error(`Database connection error : ${err.message}`);
    process.exit(1); //exit if DB failed
  }
};

const disconnectDB = async() =>{
  await prisma.$disconnect();
}

export {connectDB , disconnectDB};