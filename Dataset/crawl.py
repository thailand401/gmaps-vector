import json
from pathlib import Path

INPUT_FILE = "benhvien.txt"
OUTPUT_FILE = "bvoutput.json"


def parse_concatenated_json(text):
    """
    Parse chuỗi chứa nhiều JSON nối liên tiếp:
    [[...]][[...]][[...]]
    """
    decoder = json.JSONDecoder()
    pos = 0
    length = len(text)

    while pos < length:
        # bỏ khoảng trắng
        while pos < length and text[pos].isspace():
            pos += 1

        if pos >= length:
            break

        try:
            obj, end = decoder.raw_decode(text, pos)
            yield obj
            pos = end

        except json.JSONDecodeError as e:
            print(f"\nLỗi tại offset {e.pos}")
            start = max(0, e.pos - 100)
            stop = min(length, e.pos + 100)

            print("Context:")
            print(text[start:stop])

            raise


def try_fix_escaped_quotes(text):
    """
    Nếu dữ liệu có dạng:
    [[\"abc\"]][[\"def\"]]

    thì chuyển thành:
    [["abc"]][["def"]]
    """
    return text.replace(r"\"", '"')


def main():
    raw = Path(INPUT_FILE).read_text(
        encoding="utf-8",
        errors="replace"
    )

    # thử parse trực tiếp
    try:
        results = list(parse_concatenated_json(raw))

    except json.JSONDecodeError:
        print("Thử sửa escape quotes...")

        fixed = try_fix_escaped_quotes(raw)

        results = list(parse_concatenated_json(fixed))

    print(f"Đã parse thành công {len(results)} JSON")

    Path(OUTPUT_FILE).write_text(
        json.dumps(
            results,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print(f"Đã lưu: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()