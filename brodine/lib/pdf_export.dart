import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

class PdfExportService {
  static final PdfColor _pageColor = PdfColor.fromHex('#000000');
  static final PdfColor _cardColor = PdfColor.fromHex('#111111');
  static final PdfColor _bodyColor = PdfColor.fromHex('#DDDDDD');
  static final PdfColor _mutedColor = PdfColor.fromHex('#B0B0B0');

  static Future<void> exportNote(
    String title,
    String rawContent,
    String coverImage,
  ) async {
    final pdf = pw.Document();
    final coverProvider = await _loadCoverProvider(coverImage);
    final contentBlocks = _parseContent(rawContent);

    pdf.addPage(
      pw.MultiPage(
        pageTheme: pw.PageTheme(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.symmetric(horizontal: 28, vertical: 24),
        ),
        build: (_) => [
          pw.Container(
            width: double.infinity,
            color: _pageColor,
            padding: const pw.EdgeInsets.all(18),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                if (coverImage.isNotEmpty) ...[
                  _buildCoverBanner(coverImage, coverProvider),
                  pw.SizedBox(height: 24),
                ],
                pw.Text(
                  title.trim().isEmpty ? 'Untitled' : title,
                  style: pw.TextStyle(
                    color: PdfColors.white,
                    fontSize: 28,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 28),
                ...contentBlocks.map(_buildBlock),
              ],
            ),
          ),
        ],
      ),
    );

    final output = await getTemporaryDirectory();
    final sanitizedTitle = (title.trim().isEmpty ? 'note' : title.trim())
        .replaceAll(RegExp(r'[<>:"/\\|?*]+'), '')
        .replaceAll(RegExp(r'\s+'), '_');
    final file = File('${output.path}/$sanitizedTitle.pdf');

    await file.writeAsBytes(await pdf.save());
    await Share.shareXFiles(
      [XFile(file.path)],
      text: 'Here is my note: ${title.trim().isEmpty ? 'Untitled' : title}',
    );
  }

  static Future<pw.ImageProvider?> _loadCoverProvider(String coverImage) async {
    if (!coverImage.startsWith('http')) return null;
    try {
      final response = await http.get(Uri.parse(coverImage));
      if (response.statusCode == 200) {
        return pw.MemoryImage(response.bodyBytes);
      }
    } catch (_) {}
    return null;
  }

  static pw.Widget _buildCoverBanner(
    String coverImage,
    pw.ImageProvider? coverProvider,
  ) {
    final borderRadius = pw.BorderRadius.circular(18);

    if (coverProvider != null) {
      return pw.ClipRRect(
        horizontalRadius: 18,
        verticalRadius: 18,
        child: pw.SizedBox(
          height: 190,
          width: double.infinity,
          child: pw.Stack(
            fit: pw.StackFit.expand,
            children: [
              pw.Image(coverProvider, fit: pw.BoxFit.cover),
              pw.Container(
                decoration: pw.BoxDecoration(
                  gradient: pw.LinearGradient(
                    begin: pw.Alignment.topCenter,
                    end: pw.Alignment.bottomCenter,
                    colors: const [
                      PdfColor(0, 0, 0, 0),
                      PdfColor(0, 0, 0, 0.35),
                      PdfColor(0, 0, 0, 0.85),
                    ],
                    stops: const [0.45, 0.75, 1],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (coverImage.startsWith('#')) {
      return pw.Container(
        height: 190,
        decoration: pw.BoxDecoration(
          color: PdfColor.fromHex(coverImage),
          borderRadius: borderRadius,
        ),
      );
    }

    return pw.Container(
      height: 190,
      decoration: pw.BoxDecoration(
        borderRadius: borderRadius,
        gradient: pw.LinearGradient(
          begin: pw.Alignment.topLeft,
          end: pw.Alignment.bottomRight,
          colors: [
            PdfColor.fromHex('#2C2C2E'),
            PdfColor.fromHex('#111111'),
          ],
        ),
      ),
    );
  }

  static pw.Widget _buildBlock(_PdfBlock block) {
    switch (block.type) {
      case _PdfBlockType.heading1:
        return pw.Padding(
          padding: const pw.EdgeInsets.only(top: 20, bottom: 8),
          child: pw.Text(
            _preserveWhitespace(block.text),
            textAlign: block.align,
            style: pw.TextStyle(
              color: PdfColors.white,
              fontSize: 24,
              fontWeight: pw.FontWeight.bold,
              lineSpacing: 4,
            ),
          ),
        );
      case _PdfBlockType.heading2:
        return pw.Padding(
          padding: const pw.EdgeInsets.only(top: 14, bottom: 8),
          child: pw.Text(
            _preserveWhitespace(block.text),
            textAlign: block.align,
            style: pw.TextStyle(
              color: PdfColor.fromHex('#E0E0E0'),
              fontSize: 20,
              fontWeight: pw.FontWeight.bold,
              lineSpacing: 3,
            ),
          ),
        );
      case _PdfBlockType.bullet:
        return _buildListRow('\u2022', block.text, block.align);
      case _PdfBlockType.number:
        return _buildListRow('${block.number}.', block.text, block.align);
      case _PdfBlockType.noteLink:
        return pw.Container(
          margin: const pw.EdgeInsets.symmetric(vertical: 10),
          padding: const pw.EdgeInsets.all(14),
          decoration: pw.BoxDecoration(
            color: _cardColor,
            borderRadius: pw.BorderRadius.circular(14),
            border: pw.Border.all(color: PdfColor.fromHex('#2A2A2A')),
          ),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                _preserveWhitespace(block.data['title'] ?? 'Untitled'),
                style: pw.TextStyle(
                  color: PdfColors.white,
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              if ((block.data['preview'] ?? '').toString().isNotEmpty) ...[
                pw.SizedBox(height: 6),
                pw.Text(
                  _preserveWhitespace(block.data['preview'] ?? ''),
                  style: pw.TextStyle(
                    color: _mutedColor,
                    fontSize: 11,
                    lineSpacing: 3,
                  ),
                ),
              ],
            ],
          ),
        );
      case _PdfBlockType.table:
        return pw.Container(
          margin: const pw.EdgeInsets.symmetric(vertical: 12),
          child: pw.Table(
            border: pw.TableBorder.all(color: PdfColor.fromHex('#3A3A3C')),
            columnWidths: {
              for (int i = 0; i < block.table.first.length; i++)
                i: const pw.FlexColumnWidth(),
            },
            children: block.table
                .map(
                  (row) => pw.TableRow(
                    decoration: const pw.BoxDecoration(
                      color: PdfColor(0, 0, 0, 0),
                    ),
                    children: row
                        .map(
                          (cell) => pw.Container(
                            padding: const pw.EdgeInsets.all(8),
                            color: _cardColor,
                            child: pw.Text(
                              _preserveWhitespace(cell),
                              style: pw.TextStyle(
                                color: _bodyColor,
                                fontSize: 11,
                                lineSpacing: 3,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                )
                .toList(),
          ),
        );
      case _PdfBlockType.paragraph:
        return pw.Padding(
          padding: const pw.EdgeInsets.only(top: 4, bottom: 4),
          child: pw.Text(
            _preserveWhitespace(block.text),
            textAlign: block.align,
            style: pw.TextStyle(
              color: _bodyColor,
              fontSize: 14,
              lineSpacing: 5,
            ),
          ),
        );
    }
  }

  static pw.Widget _buildListRow(String marker, String text, pw.TextAlign align) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(top: 4, bottom: 4),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Container(
            width: 20,
            alignment: pw.Alignment.topLeft,
            child: pw.Text(
              marker,
              style: pw.TextStyle(
                color: _bodyColor,
                fontSize: 14,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
          ),
          pw.Expanded(
            child: pw.Text(
              _preserveWhitespace(text),
              textAlign: align,
              style: pw.TextStyle(
                color: _bodyColor,
                fontSize: 14,
                lineSpacing: 5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  static List<_PdfBlock> _parseContent(String html) {
    final blocks = <_PdfBlock>[];
    if (html.isEmpty) return blocks;

    final cleanedHtml = html
        .replaceAll(RegExp(r'<li>\s*<p[^>]*>'), '<li>')
        .replaceAll(RegExp(r'</p>\s*</li>'), '</li>')
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n');

    final parts = cleanedHtml.split(RegExp(r'(?=<(p|h1|h2|li|note-link|table))'));
    int numberCounter = 1;

    for (final part in parts) {
      if (part.trim().isEmpty) continue;
      final align = _parseAlignment(part);
      final text = _decodeHtmlText(part.replaceAll(RegExp(r'<[^>]*>'), ''));

      if (part.contains('<note-link')) {
        blocks.add(
          _PdfBlock.noteLink(
            {
              'title': _decodeHtmlText(
                RegExp(r'title="([^"]*)"').firstMatch(part)?.group(1) ?? '',
              ),
              'preview': _decodeHtmlText(
                RegExp(r'preview="([^"]*)"').firstMatch(part)?.group(1) ?? '',
              ),
            },
          ),
        );
        numberCounter = 1;
      } else if (part.contains('<h1')) {
        blocks.add(_PdfBlock.text(_PdfBlockType.heading1, text, align: align));
        numberCounter = 1;
      } else if (part.contains('<h2')) {
        blocks.add(_PdfBlock.text(_PdfBlockType.heading2, text, align: align));
        numberCounter = 1;
      } else if (part.contains('<li')) {
        final isNumber = RegExp(r'data-list="number"').hasMatch(part);
        blocks.add(
          _PdfBlock.text(
            isNumber ? _PdfBlockType.number : _PdfBlockType.bullet,
            text,
            align: align,
            number: isNumber ? numberCounter : null,
          ),
        );
        numberCounter = isNumber ? numberCounter + 1 : 1;
      } else if (part.contains('<table')) {
        final table = <List<String>>[];
        final rows = part.split('<tr>');
        for (final rowHtml in rows) {
          if (!rowHtml.contains('<td>')) continue;
          final cells = <String>[];
          for (final cellHtml in rowHtml.split('<td>')) {
            if (!cellHtml.contains('</td>')) continue;
            cells.add(_decodeHtmlText(cellHtml.split('</td>').first));
          }
          if (cells.isNotEmpty) table.add(cells);
        }
        if (table.isNotEmpty) {
          blocks.add(_PdfBlock.table(table));
        }
        numberCounter = 1;
      } else if (_hasVisibleText(text) || part.contains('<p')) {
        blocks.add(_PdfBlock.text(_PdfBlockType.paragraph, text, align: align));
        numberCounter = 1;
      }
    }

    return blocks;
  }

  static bool _hasVisibleText(String text) {
    return text.replaceAll(RegExp(r'[\s\u00A0]'), '').isNotEmpty;
  }

  static pw.TextAlign _parseAlignment(String part) {
    if (part.contains('text-align: center')) return pw.TextAlign.center;
    if (part.contains('text-align: right')) return pw.TextAlign.right;
    if (part.contains('text-align: justify')) return pw.TextAlign.justify;
    return pw.TextAlign.left;
  }

  static String _preserveWhitespace(String text) {
    final normalized = text.replaceAll('\t', '    ');
    return normalized
        .split('\n')
        .map(
          (line) => line.replaceAllMapped(
            RegExp(r' {2,}'),
            (match) => '${'\u00A0' * (match.group(0)!.length - 1)} ',
          ),
        )
        .join('\n');
  }

  static String _decodeHtmlText(String text) {
    return text
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'");
  }
}

enum _PdfBlockType {
  paragraph,
  heading1,
  heading2,
  bullet,
  number,
  noteLink,
  table,
}

class _PdfBlock {
  final _PdfBlockType type;
  final String text;
  final pw.TextAlign align;
  final int? number;
  final Map<String, String> data;
  final List<List<String>> table;

  const _PdfBlock._({
    required this.type,
    this.text = '',
    this.align = pw.TextAlign.left,
    this.number,
    this.data = const {},
    this.table = const [],
  });

  factory _PdfBlock.text(
    _PdfBlockType type,
    String text, {
    pw.TextAlign align = pw.TextAlign.left,
    int? number,
  }) {
    return _PdfBlock._(
      type: type,
      text: text,
      align: align,
      number: number,
    );
  }

  factory _PdfBlock.noteLink(Map<String, String> data) {
    return _PdfBlock._(
      type: _PdfBlockType.noteLink,
      data: data,
    );
  }

  factory _PdfBlock.table(List<List<String>> table) {
    return _PdfBlock._(
      type: _PdfBlockType.table,
      table: table,
    );
  }
}
