# Program Kasir Sederhana

# Data produk
produk = {
    1: {"nama": "Nasi Goreng", "harga": 15000},
    2: {"nama": "Mie Ayam", "harga": 12000},
    3: {"nama": "Bakso", "harga": 13000},
    4: {"nama": "Soto Ayam", "harga": 14000},
    5: {"nama": "Es Teh", "harga": 5000},
    6: {"nama": "Es Jeruk", "harga": 6000},
    7: {"nama": "Kopi", "harga": 7000},
    8: {"nama": "Air Mineral", "harga": 4000},
}


def tampilkan_menu():
    print()
    print("=" * 40)
    print("          DAFTAR MENU")
    print("=" * 40)
    print(f"{'Kode':<6} {'Nama Produk':<20} {'Harga':>10}")
    print("-" * 40)
    for kode, item in produk.items():
        harga_str = f"Rp {item['harga']:>7,}".replace(",", ".")
        print(f"{kode:<6} {item['nama']:<20} {harga_str}")
    print("=" * 40)


def hitung_total(keranjang):
    total = 0
    for kode, jumlah in keranjang.items():
        total += produk[kode]["harga"] * jumlah
    return total


def cetak_struk(keranjang, bayar):
    total = hitung_total(keranjang)
    kembalian = bayar - total

    print()
    print("=" * 40)
    print("          STRUK PEMBELIAN")
    print("=" * 40)

    for kode, jumlah in keranjang.items():
        nama = produk[kode]["nama"]
        harga = produk[kode]["harga"]
        subtotal = harga * jumlah
        subtotal_str = f"Rp {subtotal:>7,}".replace(",", ".")
        print(f"{nama:<15} x{jumlah:<3} {subtotal_str:>14}")

    print("-" * 40)
    total_str = f"Rp {total:>10,}".replace(",", ".")
    bayar_str = f"Rp {bayar:>10,}".replace(",", ".")
    kembalian_str = f"Rp {kembalian:>10,}".replace(",", ".")
    print(f"{'Total:':<15} {total_str}")
    print(f"{'Bayar:':<15} {bayar_str}")
    print(f"{'Kembalian:':<15} {kembalian_str}")
    print("=" * 40)
    print("         Terima Kasih!")
    print("=" * 40)


def main():
    keranjang = {}

    print()
    print("=" * 40)
    print("     SELAMAT DATANG DI TOKO KAMI")
    print("=" * 40)

    tampilkan_menu()
    print("Masukkan kode produk dipisah koma (contoh: 1, 3, 5)")
    print("Ketik 0 untuk selesai")
    print()

    pesanan = input("Kode produk: ").strip()

    if pesanan == "0" or pesanan == "":
        print("Keranjang kosong. Terima kasih telah berkunjung!")
        return

    kode_list = []
    items = pesanan.split(",")
    for item in items:
        try:
            kode = int(item.strip())
            if kode not in produk:
                print(f"Kode {kode} tidak valid, dilewati.")
                continue
            kode_list.append(kode)
        except ValueError:
            print(f"Input tidak valid: '{item.strip()}', dilewati.")
            continue

    if not kode_list:
        print("Tidak ada produk valid. Terima kasih!")
        return

    print()
    for kode in kode_list:
        while True:
            try:
                jumlah = int(input(f"Jumlah {produk[kode]['nama']}: "))
                if jumlah <= 0:
                    print("Jumlah harus lebih dari 0!")
                    continue
                break
            except ValueError:
                print("Masukkan angka yang valid!")
                continue

        if kode in keranjang:
            keranjang[kode] += jumlah
        else:
            keranjang[kode] = jumlah

    if not keranjang:
        print("Keranjang kosong. Terima kasih telah berkunjung!")
        return

    print()
    print("-" * 40)
    print("RINGKASAN BELANJA:")
    total = hitung_total(keranjang)
    for kode, jumlah in keranjang.items():
        nama = produk[kode]["nama"]
        subtotal = produk[kode]["harga"] * jumlah
        subtotal_str = f"Rp {subtotal:,}".replace(",", ".")
        print(f"- {nama} x{jumlah} = {subtotal_str}")
    total_str = f"Rp {total:,}".replace(",", ".")
    print(f"Total Belanja: {total_str}")
    print("-" * 40)

    while True:
        try:
            bayar = int(input("Masukkan jumlah uang bayar: Rp "))

            if bayar < total:
                kurang_str = f"Rp {total - bayar:,}".replace(",", ".")
                print(f"Uang tidak cukup! Kurang {kurang_str}")
                continue

            break
        except ValueError:
            print("Input tidak valid! Masukkan angka.")
            continue

    cetak_struk(keranjang, bayar)


if __name__ == "__main__":
    main()
