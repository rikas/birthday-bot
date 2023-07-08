import CyclicDb from "@cyclic.sh/dynamodb";
import { BirthdayRecord, BirthdayListEntry } from "./types";

const db = CyclicDb(process.env.CYCLIC_DB);
const birthdays = db.collection(process.env.CYCLIC_DB_COLLECTION);

type DBKeyArgs = Pick<BirthdayRecord, "name" | "date" | "chatId">;

function buildRecordKey(record: DBKeyArgs): string {
  const { chatId, name } = record;

  return `${chatId}:${name}`;
}

export async function addRecord({ ...params }: BirthdayRecord) {
  const key = buildRecordKey(params);

  console.log(`Adicionando ${key}: ${JSON.stringify(params)}`);

  const record = await birthdays.set(
    key,
    { ...params },
    {
      $index: ["chatId"],
    }
  );

  return parseRecord(record);
}

export async function removeRecord({ ...params }: DBKeyArgs) {
  const key = buildRecordKey(params);
  const record = await birthdays.get(key);

  if (record) {
    return await record.delete();
  } else {
    throw new Error("404");
  }
}

export async function clearDB() {
  for (let record of (await birthdays.list()).results) {
    await record.delete();
  }
}

const parseList = (dbList: { results: any[] }): BirthdayListEntry[] => {
  return dbList.results.map((result) => parseRecord(result));
};

const parseRecord = (dbRecord: any): BirthdayListEntry => {
  const { gender, date, name, tgId, chatId, day, month } = dbRecord.props;

  return {
    date,
    name,
    gender,
    tgId,
    chatId,
  };
};

export async function getRecord({
  ...params
}: DBKeyArgs): Promise<BirthdayListEntry> {
  const key = buildRecordKey(params);
  const record = await birthdays.get(key);

  return parseRecord(record);
}

export async function getRecords(): Promise<BirthdayListEntry[]> {
  const list = await birthdays.list();

  return parseList(list);
}

export async function getRecordsByChatId(
  chatId: number
): Promise<BirthdayListEntry[]> {
  const list = await birthdays.index("chatId").find(chatId);

  return parseList(list);
}

export async function getRecordsByDayAndMonth({
  day,
  month,
}: {
  month: number;
  day: number;
}): Promise<BirthdayListEntry[]> {
  return parseList(await birthdays.filter({ month, day }));
}
