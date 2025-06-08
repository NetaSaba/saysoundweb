import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

SERVICE_ACCOUNT_FILE = '.credentials/hollenOogoe.json'  # 你的 GCP 憑證 JSON 檔
SPREADSHEET_ID = '1F28WsUNvy-yEsg5yRDM8m454GtQ2eMBIE0hlzBCHj5c'  # 替換為實際的 spreadsheet ID
RANGE_NAME = 'MameKuro_Saysounds!A2:J'

creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE,
    scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
)
service = build('sheets', 'v4', credentials=creds)
sheet = service.spreadsheets()

result = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME).execute()
rows = result.get('values', [])

data = {}
alias_map = {}

total_items = 0
total_aliases = 0

for row in rows:
    while len(row) < 10:
        row.append("")  # 補齊缺欄

    command, path, volume, alias, ja, zh, en, _, _, hollen_trans = row

    if not command.strip():
        # print msg on console
        print(">", end="")
        continue  # 跳過空白 key


    key = command.strip()
    alias = alias.strip()
    file_path = path.strip() or key
    volume = float(volume.strip()) if volume.strip() else 1.0

    # 建立主鍵
    data[key] = {
        "path": f"kurome/mamekuro/{file_path}",
        "volume": volume,
        "ja": ja.strip(),
        "zh": zh.strip(),
        "en": en.strip() if en.strip() else hollen_trans.strip()
    }

    if alias:
        alias_map[alias] = key

    total_items += 1

# 將 alias 加入 referTo 鍵
for alias, target in alias_map.items():
    if target in data:
        data[alias] = {
            "referTo": target
        }
        total_aliases += 1

# 輸出 JSON
with open("saysound_data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 輸出統計資訊
print(f"下載 Google Sheet 到 Json 完成!")
print(f"總項目數: {total_items}")
print(f"別名數量: {total_aliases}")