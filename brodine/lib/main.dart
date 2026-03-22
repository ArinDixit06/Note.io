import 'dart:convert';
import 'dart:async';
import 'dart:ui';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'pdf_export.dart'; 

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Colors.black,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const BromineApp());
}

// ==========================================
// 1. APP CONFIG
// ==========================================
class BromineApp extends StatelessWidget {
  const BromineApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bromine Notes',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: Colors.black,
        cardColor: const Color(0xFF1C1C1E),
        iconTheme: const IconThemeData(color: Colors.white70),
        textSelectionTheme: const TextSelectionThemeData(
          cursorColor: Color(0xFF64B5F6),
          selectionColor: Color(0xFF204060),
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).apply(
          bodyColor: const Color(0xFFEEEEEE),
          displayColor: Colors.white,
        ),
      ),
      home: const DashboardScreen(),
    );
  }
}

// ==========================================
// 2. DASHBOARD
// ==========================================
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool isSidebarOpen = true;
  List<NoteData> _notes = [];
  bool _isLoading = true;
  Timer? _autoFetchTimer;

  final SyncService _syncService = SyncService.instance;

  @override
  void initState() {
    super.initState();
    _initialLoad();

    Connectivity().onConnectivityChanged.listen((result) {
      bool hasInternet = result != ConnectivityResult.none;
      if (result is List) hasInternet = (result as List).any((r) => r != ConnectivityResult.none);
      if (hasInternet) _performFullSync();
    });

    _autoFetchTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      _performFullSync();
    });
  }

  @override
  void dispose() {
    _autoFetchTimer?.cancel();
    super.dispose();
  }

  Future<void> _initialLoad() async {
    await _refreshLocalNotes();
    _performFullSync();
  }

  Future<void> _refreshLocalNotes() async {
    try {
      final notes = await DatabaseHelper.instance.getAllNotes();
      if (mounted) setState(() { _notes = notes; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _performFullSync() async {
    _syncService.syncPendingNotes().then((_) {
        _syncService.fetchServerNotes().then((_) {
            _refreshLocalNotes();
        });
    });
  }

  Future<void> createNote() async {
    final newNote = NoteData(
      id: const Uuid().v4(),
      serverId: null,
      title: "Untitled",
      preview: "",
      rawContent: "<p></p>",
      coverImage: "",
      date: DateTime.now(),
      isSynced: false,
      isDeleted: false,
    );

    await DatabaseHelper.instance.insertNote(newNote);
    await _refreshLocalNotes();

    if (mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => BlockEditorScreen(
            note: newNote,
            onSave: _refreshLocalNotes,
          ),
        ),
      );
    }
  }

  void toggleSidebar() => setState(() => isSidebarOpen = !isSidebarOpen);

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 768;

    return Scaffold(
      drawer: isMobile ? const Drawer(backgroundColor: Color(0xFF121214), child: SidebarContent()) : null,
      body: Stack(
        children: [
          const BackgroundGlow(),
          Row(
            children: [
              if (!isMobile)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: isSidebarOpen ? 260 : 0,
                  curve: Curves.easeInOutQuart,
                  child: ClipRect(
                    child: OverflowBox(
                      minWidth: 260, maxWidth: 260, alignment: Alignment.topLeft,
                      child: const SidebarContent(),
                    ),
                  ),
                ),
              Expanded(
                child: Column(
                  children: [
                    if (isMobile)
                      AppBar(
                        backgroundColor: Colors.transparent,
                        elevation: 0,
                        leading: IconButton(icon: const Icon(Icons.menu), onPressed: () => Scaffold.of(context).openDrawer()),
                      ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24.0),
                        child: CustomScrollView(
                          slivers: [
                            const SliverToBoxAdapter(child: SizedBox(height: 40)),
                            SliverToBoxAdapter(child: DashboardHeader(onCreate: createNote)),
                            const SliverToBoxAdapter(child: SizedBox(height: 40)),

                            if (_isLoading)
                              const SliverToBoxAdapter(child: Center(child: CircularProgressIndicator()))
                            else if (_notes.isEmpty)
                              const SliverToBoxAdapter(child: Center(child: Text('No notes found.', style: TextStyle(color: Colors.grey))))
                            else
                              SliverGrid(
                                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                                  maxCrossAxisExtent: 350,
                                  mainAxisSpacing: 24,
                                  crossAxisSpacing: 24,
                                  childAspectRatio: 0.85,
                                ),
                                delegate: SliverChildBuilderDelegate(
                                  (context, index) => GestureDetector(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => BlockEditorScreen(
                                            note: _notes[index],
                                            onSave: _refreshLocalNotes,
                                          ),
                                        ),
                                      );
                                    },
                                    child: NoteCard(note: _notes[index]),
                                  ),
                                  childCount: _notes.length,
                                ),
                              ),
                            const SliverToBoxAdapter(child: SizedBox(height: 100)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (!isMobile)
            Positioned(
              top: 15, left: isSidebarOpen ? 265 : 15,
              child: GestureDetector(
                onTap: toggleSidebar,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  child: Icon(isSidebarOpen ? Icons.keyboard_double_arrow_left : Icons.keyboard_double_arrow_right, color: Colors.grey),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ==========================================
// 3. DATABASE & SYNC
// ==========================================
class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;
  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('bromine_notes_v5.db'); // Bumped version for new schema logic if needed
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, filePath);
    return await openDatabase(path, version: 1, onCreate: _createDB);
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
    CREATE TABLE notes (
      id TEXT PRIMARY KEY,
      server_id TEXT, 
      title TEXT,
      content TEXT,
      coverImage TEXT,
      createdAt TEXT,
      isSynced INTEGER,
      isDeleted INTEGER
    )
    ''');
  }

  Future<void> insertNote(NoteData note) async {
    final db = await instance.database;
    if (note.serverId == null) {
      final List<Map<String, dynamic>> maps = await db.query(
        'notes',
        columns: ['server_id'],
        where: 'id = ?',
        whereArgs: [note.id],
      );
      if (maps.isNotEmpty && maps.first['server_id'] != null) {
        String existingServerId = maps.first['server_id'] as String;
        note = note.copyWith(serverId: existingServerId);
      }
    }
    await db.insert('notes', note.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> setServerId(String localId, String newServerId) async {
    final db = await instance.database;
    await db.update('notes', {'server_id': newServerId, 'isSynced': 1}, where: 'id = ?', whereArgs: [localId]);
  }

  Future<NoteData?> getNoteByServerId(String serverId) async {
    final db = await instance.database;
    final maps = await db.query('notes', where: 'server_id = ?', whereArgs: [serverId]);
    if (maps.isNotEmpty) return NoteData.fromMap(maps.first);
    return null;
  }

  Future<NoteData?> findPotentialDuplicate(String title) async {
    final db = await instance.database;
    final result = await db.query(
      'notes',
      where: 'title = ? AND (server_id IS NULL OR server_id = "") AND isDeleted = 0',
      whereArgs: [title],
      limit: 1, 
    );
    if (result.isNotEmpty) return NoteData.fromMap(result.first);
    return null;
  }

  Future<NoteData?> getNote(String id) async {
    final db = await instance.database;
    final maps = await db.query('notes', where: 'id = ?', whereArgs: [id]);
    if (maps.isNotEmpty) return NoteData.fromMap(maps.first);
    return null;
  }

  Future<List<NoteData>> getAllNotes() async {
    final db = await instance.database;
    final result = await db.query('notes', where: 'isDeleted = 0', orderBy: 'createdAt DESC');
    return result.map((json) => NoteData.fromMap(json)).toList();
  }
  
  Future<List<NoteData>> getUnsyncedNotes() async {
    final db = await instance.database;
    final result = await db.query('notes', where: 'isSynced = 0');
    return result.map((json) => NoteData.fromMap(json)).toList();
  }

  Future<void> deleteNoteLocal(String id) async {
    final db = await instance.database;
    await db.update('notes', {'isDeleted': 1, 'isSynced': 0}, where: 'id = ?', whereArgs: [id]);
  }
}

class SyncService {
  static final SyncService instance = SyncService._internal();
  SyncService._internal();

  final String apiUrl = 'https://note-io-6fm6.onrender.com/api/notes';
  bool _isSyncing = false;
  bool _syncAgain = false; 

  Future<void> syncPendingNotes() async {
    if (_isSyncing) {
      _syncAgain = true;
      return;
    }
    _isSyncing = true;
    try {
      var connectivityResult = await (Connectivity().checkConnectivity());
      if (connectivityResult == ConnectivityResult.none) return;
      await _processQueue();
    } catch (e) {
      print("Sync Error: $e");
    } finally {
      _isSyncing = false;
      if (_syncAgain) {
        _syncAgain = false;
        syncPendingNotes(); 
      }
    }
  }

  Future<void> _processQueue() async {
    final unsynced = await DatabaseHelper.instance.getUnsyncedNotes();
    for (var note in unsynced) {
      if (note.isDeleted) {
        if (note.serverId != null) {
            try { await http.delete(Uri.parse('$apiUrl/${note.serverId}')); } catch (_) {}
        }
        final db = await DatabaseHelper.instance.database;
        await db.delete('notes', where: 'id = ?', whereArgs: [note.id]); 
      } else {
        if (note.serverId != null) {
          try {
            var res = await http.put(
              Uri.parse('$apiUrl/${note.serverId}'),
              headers: {"Content-Type": "application/json"},
             body: json.encode({
                  "localId": note.id,
                  "title": note.title, 
                  "content": note.rawContent, 
                  "coverImage": note.coverImage
                }),
            );
            if (res.statusCode == 200) {
               final db = await DatabaseHelper.instance.database;
               await db.update('notes', {'isSynced': 1}, where: 'id = ?', whereArgs: [note.id]);
            } else if (res.statusCode == 404) {
               final db = await DatabaseHelper.instance.database;
               await db.update('notes', {'server_id': null}, where: 'id = ?', whereArgs: [note.id]);
            }
          } catch (e) { print("Update failed: $e"); }
        } else {
          try {
             var res = await http.post(
              Uri.parse(apiUrl),
              headers: {"Content-Type": "application/json"},
             body: json.encode({
                  "localId": note.id,
                  "title": note.title, 
                  "content": note.rawContent, 
                  "coverImage": note.coverImage
                }),
            );
            if (res.statusCode == 201) {
              final serverData = json.decode(res.body);
              String newServerId = serverData['_id'];
              await DatabaseHelper.instance.setServerId(note.id, newServerId);
            }
          } catch (e) { print("Create failed: $e"); }
        }
      }
    }
  }

  Future<void> fetchServerNotes() async {
     if (_isSyncing) return; 
     try {
       var connectivityResult = await (Connectivity().checkConnectivity());
       if (connectivityResult == ConnectivityResult.none) return;

       final response = await http.get(Uri.parse(apiUrl)).timeout(const Duration(seconds: 10));
       if (response.statusCode == 200) {
         final List<dynamic> serverNotes = json.decode(response.body);
         for (var n in serverNotes) {
            String serverId = n['_id'];
            NoteData? existingLocal = await DatabaseHelper.instance.getNoteByServerId(serverId);
            
            if (existingLocal != null) {
               if (existingLocal.isSynced) {
                  NoteData updated = existingLocal.copyWith(
                    title: n['title'],
                    rawContent: n['content'] ?? "",
                    preview: HtmlParser.previewText(n['content'] ?? ""),
                    coverImage: n['coverImage'],
                    date: DateTime.tryParse(n['createdAt'] ?? "") ?? DateTime.now(),
                    isSynced: true,
                  );
                  await DatabaseHelper.instance.insertNote(updated);
               }
            } else {
               NoteData? potentialDuplicate = await DatabaseHelper.instance.findPotentialDuplicate(n['title'] ?? "Untitled");
               
               if (potentialDuplicate != null) {
                 await DatabaseHelper.instance.setServerId(potentialDuplicate.id, serverId);
               } else {
                 NoteData newNote = NoteData(
                   id: const Uuid().v4(),
                   serverId: serverId,
                   title: n['title'] ?? "Untitled",
                   rawContent: n['content'] ?? "",
                   preview: HtmlParser.previewText(n['content'] ?? ""),
                   coverImage: n['coverImage'] ?? "",
                   date: DateTime.tryParse(n['createdAt'] ?? "") ?? DateTime.now(),
                   isSynced: true,
                   isDeleted: false,
                 );
                 await DatabaseHelper.instance.insertNote(newNote);
               }
            }
         }
       }
     } catch (e) { print("Server fetch failed: $e"); }
  }
}

// ==========================================
// 4. EDITOR SCREEN (REDESIGNED + TABLES)
// ==========================================
class BlockEditorScreen extends StatefulWidget {
  final NoteData note;
  final VoidCallback onSave;

  const BlockEditorScreen({super.key, required this.note, required this.onSave});

  @override
  State<BlockEditorScreen> createState() => _BlockEditorScreenState();
}

class _BlockEditorScreenState extends State<BlockEditorScreen> {
  late TextEditingController _titleController;
  late List<EditorBlock> _blocks;
  late String _coverImage;
  Timer? _debounce;
  final ScrollController _scrollController = ScrollController();
  int _focusedBlockIndex = -1;
  late String? _serverId;
  bool _isSaving = false;
  bool _saveAgain = false;
  bool _isApplyingBlockTextChange = false;

  final List<String> _coverPresets = [
    "#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF3333", "#33FFF5",
    "#E5E5E5", "#FFD700", "#FF6B6B", "#4ECDC4", "#1A535C", "#6C5CE7",
    "#0F766E", "#F59E0B", "#EF4444", "#0EA5E9", "#111827", "#E11D48",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1511300636408-a63a89df3482?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80",
  ];

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.note.title);
    _coverImage = widget.note.coverImage;
    _blocks = HtmlParser.parse(widget.note.rawContent);
    if (_blocks.isEmpty) _blocks.add(EditorBlock(type: BlockType.paragraph));
    
    _serverId = widget.note.serverId;
    
    _attachFocusListeners();
  }

  void _attachFocusListeners() {
    for (final block in _blocks) {
      _registerFocusListener(block);
    }
  }

  void _registerFocusListener(EditorBlock block) {
    if (block.type == BlockType.table || block.hasFocusListener) return;
    block.hasFocusListener = true;
    block.focusNode.addListener(() {
      if (!mounted || !block.focusNode.hasFocus) return;
      final index = _blocks.indexOf(block);
      if (index != -1) {
        setState(() => _focusedBlockIndex = index);
      }
    });
  }

  Future<void> _saveLocal() async {
    if (_isSaving) {
      _saveAgain = true;
      return;
    }
    _isSaving = true;
    try {
      final currentNote = await DatabaseHelper.instance.getNote(widget.note.id);
      if (currentNote != null) _serverId = currentNote.serverId;

      String htmlContent = HtmlParser.stringify(_blocks);
      final updatedNote = NoteData(
        id: widget.note.id,
        serverId: _serverId,
        title: _titleController.text,
        rawContent: htmlContent,
        preview: HtmlParser.previewText(htmlContent),
        coverImage: _coverImage,
        date: DateTime.now(),
        isSynced: false,
        isDeleted: false,
      );

      await DatabaseHelper.instance.insertNote(updatedNote);
      await SyncService.instance.syncPendingNotes();
      widget.onSave(); 
    } finally {
      _isSaving = false;
      if (_saveAgain) {
        _saveAgain = false;
        _saveLocal();
      }
    }
  }

  void _debouncedSave() {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 2000), () => _saveLocal());
  }

  void _replaceBlock(int index, BlockType type, {Map<String, dynamic>? data}) {
    setState(() {
      final oldText = _blocks[index].controller?.text ?? "";
      final oldAlign = _blocks[index].align;
      _blocks[index] = EditorBlock(type: type, data: data, text: oldText, align: oldAlign);
      _registerFocusListener(_blocks[index]);
    });
    if (type != BlockType.table) {
       WidgetsBinding.instance.addPostFrameCallback((_) => _blocks[index].focusNode.requestFocus());
    }
    _debouncedSave();
  }

  void _insertBlockAfter(int index, BlockType type) {
    late EditorBlock newBlock;
    setState(() {
      newBlock = EditorBlock(type: type);
      _blocks.insert(index + 1, newBlock);
      _registerFocusListener(newBlock);
    });
    
    if (type != BlockType.table) {
      WidgetsBinding.instance.addPostFrameCallback((_) => newBlock.focusNode.requestFocus());
    }
    _debouncedSave();
  }

  void _handleBlockChanged(int index, String value) {
    if (_isApplyingBlockTextChange) return;
    if (value.contains('\n')) {
      _splitBlockOnEnter(index, value);
      return;
    }
    if (value.endsWith("/")) _showSlashMenu(index);
    _debouncedSave();
  }

  void _splitBlockOnEnter(int index, String value) {
    if (index < 0 || index >= _blocks.length) return;

    final block = _blocks[index];
    final controller = block.controller;
    if (controller == null) return;

    final normalized = value.replaceAll('\r\n', '\n');
    final parts = normalized.split('\n');
    if (parts.length < 2) return;

    final firstLine = parts.first;
    final trailingLines = parts.sublist(1);

    if ((block.type == BlockType.bullet || block.type == BlockType.number) &&
        parts.length == 2 &&
        firstLine.isEmpty &&
        trailingLines.first.isEmpty) {
      _replaceBlock(index, BlockType.paragraph);
      return;
    }

    final nextType = (block.type == BlockType.bullet || block.type == BlockType.number)
        ? block.type
        : BlockType.paragraph;

    final newBlocks = trailingLines
        .map((line) => EditorBlock(type: nextType, text: line, align: block.align))
        .toList();

    for (final newBlock in newBlocks) {
      _registerFocusListener(newBlock);
    }

    setState(() {
      _isApplyingBlockTextChange = true;
      controller.text = firstLine;
      controller.selection = TextSelection.collapsed(offset: firstLine.length);
      _blocks.insertAll(index + 1, newBlocks);
      _isApplyingBlockTextChange = false;
    });

    if (newBlocks.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        newBlocks.first.focusNode.requestFocus();
        newBlocks.first.controller?.selection = TextSelection.collapsed(
          offset: newBlocks.first.controller?.text.length ?? 0,
        );
      });
    }

    _debouncedSave();
  }

  void _handleEnter(int index) {
    final currentBlock = _blocks[index];
    if ((currentBlock.type == BlockType.bullet || currentBlock.type == BlockType.number) && currentBlock.controller!.text.isEmpty) {
      _replaceBlock(index, BlockType.paragraph);
      return;
    }
    if (currentBlock.type == BlockType.bullet || currentBlock.type == BlockType.number) {
       _insertBlockAfter(index, currentBlock.type);
    } else {
       _insertBlockAfter(index, BlockType.paragraph);
    }
  }

  // --- SMART PASTE IMPLEMENTATION ---
  Future<void> _handleSmartPaste() async {
    ClipboardData? data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data == null || data.text == null) return;
    String text = data.text!;

    List<EditorBlock> newBlocks = [];
    
    // Simple Heuristic Parser for Clipboard Content
    // 1. Check if it looks like HTML table
    if (text.contains("<table>")) {
      newBlocks.addAll(HtmlParser.parse(text));
    } 
    // 2. Check for list items or plain text lines
    else {
      final lines = text.split('\n');
      for (var line in lines) {
        line = line.trim();
        if (line.isEmpty) continue;

        if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
          // Bullet List
          String content = line.substring(2).trim();
          newBlocks.add(EditorBlock(type: BlockType.bullet, text: content));
        } else if (RegExp(r'^\d+\.').hasMatch(line)) {
          // Numbered List
          String content = line.replaceFirst(RegExp(r'^\d+\.\s*'), '').trim();
          newBlocks.add(EditorBlock(type: BlockType.number, text: content));
        } else if (line.contains('\t')) {
           // Tab separated values -> Convert to single row table (can be expanded)
           List<String> cells = line.split('\t');
           List<List<TextEditingController>> grid = [];
           List<TextEditingController> row = cells.map((c) => TextEditingController(text: c)).toList();
           grid.add(row);
           newBlocks.add(EditorBlock(type: BlockType.table, gridData: grid));
        } else {
          // Paragraph
          newBlocks.add(EditorBlock(type: BlockType.paragraph, text: line));
        }
      }
    }

    if (newBlocks.isNotEmpty) {
      setState(() {
        // Insert after focused block or at end
        int insertIndex = _focusedBlockIndex != -1 ? _focusedBlockIndex + 1 : _blocks.length;
        _blocks.insertAll(insertIndex, newBlocks);
      });
      _attachFocusListeners(); // Re-attach listeners for new blocks
      _debouncedSave();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Smart Paste: Content preserved!")));
    }
  }

  void _updateAlignment(TextAlign align) {
    if (_focusedBlockIndex >= 0 && _focusedBlockIndex < _blocks.length) {
      setState(() => _blocks[_focusedBlockIndex].align = align);
      _debouncedSave();
    }
  }

  void _showCoverMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1C1C1E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          height: 350,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Choose Cover", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  if (_coverImage.isNotEmpty)
                    TextButton(
                      onPressed: () { setState(() => _coverImage = ""); Navigator.pop(context); _debouncedSave(); },
                      child: const Text("Remove", style: TextStyle(color: Colors.redAccent)),
                    )
                ],
              ),
              const SizedBox(height: 20),
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 5, mainAxisSpacing: 12, crossAxisSpacing: 12),
                  itemCount: _coverPresets.length,
                  itemBuilder: (context, index) {
                    final cover = _coverPresets[index];
                    return GestureDetector(
                      onTap: () { setState(() => _coverImage = cover); Navigator.pop(context); _debouncedSave(); },
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.grey[800],
                          borderRadius: BorderRadius.circular(8),
                          image: cover.startsWith('http') ? DecorationImage(image: NetworkImage(cover), fit: BoxFit.cover) : null,
                          border: Border.all(color: Colors.white12),
                        ),
                        child: !cover.startsWith('http') ? Container(decoration: BoxDecoration(color: _hexToColor(cover), borderRadius: BorderRadius.circular(8))) : null,
                      ),
                    );
                  },
                ),
              )
            ],
          ),
        );
      },
    );
  }

  void _showSlashMenu(int index) {
    final text = _blocks[index].controller?.text ?? "";
    if (text.endsWith("/")) _blocks[index].controller?.text = text.substring(0, text.length - 1);

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF2C2C2E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _slashMenuItem(Icons.title, "Large Heading", () => _replaceBlock(index, BlockType.heading1)),
              _slashMenuItem(Icons.format_size, "Medium Heading", () => _replaceBlock(index, BlockType.heading2)),
              _slashMenuItem(Icons.format_list_bulleted, "Bullet List", () => _replaceBlock(index, BlockType.bullet)),
              _slashMenuItem(Icons.format_list_numbered, "Numbered List", () => _replaceBlock(index, BlockType.number)),
              // --- NEW: Table Option ---
              _slashMenuItem(Icons.grid_on, "Table (3x3)", () => _replaceBlock(index, BlockType.table)),
              _slashMenuItem(Icons.link, "Link Note", () => _showNoteLinkPicker(index)),
            ],
          ),
        );
      },
    );
  }

  Widget _slashMenuItem(IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: Colors.grey[800], borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
      title: Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
      onTap: () { Navigator.pop(context); onTap(); },
    );
  }

  void _showNoteLinkPicker(int index) async {
    final allNotes = await DatabaseHelper.instance.getAllNotes(); 
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1C1C1E),
      isScrollControlled: true,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          builder: (_, controller) {
            return Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const Text("Link a Note", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 10),
                  Expanded(
                    child: ListView.builder(
                      controller: controller,
                      itemCount: allNotes.length,
                      itemBuilder: (context, i) {
                        final n = allNotes[i];
                        if (n.id == widget.note.id) return const SizedBox.shrink();
                        return ListTile(
                          title: Text(n.title, style: const TextStyle(color: Colors.white)),
                          onTap: () {
                            Navigator.pop(context);
                            _replaceBlock(index, BlockType.noteLink, data: {
                              "id": n.id, "title": n.title, "cover": n.coverImage, "preview": n.preview, "date": n.date.toIso8601String(),
                            });
                            _insertBlockAfter(index, BlockType.paragraph);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _deleteNote() async {
    await DatabaseHelper.instance.deleteNoteLocal(widget.note.id);
    widget.onSave(); 
    SyncService.instance.syncPendingNotes(); 
    if (mounted) Navigator.pop(context);
  }

  void _exportToPdf() async {
    try {
      await PdfExportService.exportNote(
        _titleController.text,
        HtmlParser.stringify(_blocks),
        _coverImage,
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error exporting PDF: $e")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, 
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20, color: Colors.white70), 
          onPressed: () { _saveLocal(); Navigator.pop(context); }
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.ios_share, color: Colors.white70), 
            onPressed: _exportToPdf
          ),
          IconButton(icon: const Icon(Icons.delete_outline, color: Colors.redAccent), onPressed: _deleteNote)
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    // Tap on empty space creates a new paragraph at bottom
                    if (_blocks.isEmpty || _blocks.last.type == BlockType.noteLink || _blocks.last.type == BlockType.table) {
                      setState(() => _blocks.add(EditorBlock(type: BlockType.paragraph)));
                    }
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (_blocks.isNotEmpty && _blocks.last.type != BlockType.table) _blocks.last.focusNode.requestFocus();
                    });
                  },
                  child: SingleChildScrollView(
                    controller: _scrollController,
                    physics: const BouncingScrollPhysics(),
                    child: Column(
                      children: [
                        // Cover Image
                        if (_coverImage.isNotEmpty)
                          SizedBox(
                            height: 250, 
                            width: double.infinity, 
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                _buildTinyCover(_coverImage),
                                Positioned.fill(
                                  child: Container(
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        begin: Alignment.topCenter,
                                        end: Alignment.bottomCenter,
                                        colors: [Colors.transparent, Colors.black.withOpacity(0.5), Colors.black],
                                        stops: const [0.5, 0.8, 1.0],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )
                        else 
                          const SizedBox(height: 100),
                        
                        Padding(
                           padding: const EdgeInsets.symmetric(horizontal: 24),
                           child: Column(
                             crossAxisAlignment: CrossAxisAlignment.start,
                             children: [
                               // TITLE INPUT
                               TextField(
                                 controller: _titleController,
                                 onChanged: (_) => _debouncedSave(),
                                 style: GoogleFonts.inter(fontSize: 40, fontWeight: FontWeight.w800, color: Colors.white, height: 1.1, letterSpacing: -0.5),
                                 decoration: InputDecoration(
                                   hintText: "Untitled", 
                                   border: InputBorder.none, 
                                   hintStyle: TextStyle(color: Colors.grey[800]),
                                   contentPadding: EdgeInsets.zero,
                                 ),
                                 maxLines: null,
                               ),
                               const SizedBox(height: 30),

                               // BLOCKS LIST
                               ListView.builder(
                                 shrinkWrap: true, 
                                 physics: const NeverScrollableScrollPhysics(),
                                 itemCount: _blocks.length,
                                 padding: EdgeInsets.zero,
                                 itemBuilder: (context, index) {
                                   return _renderBlock(_blocks[index], index);
                                 },
                               ),
                               const SizedBox(height: 200),
                             ],
                           ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          
          // FLOATING TOOLBAR
          Positioned(
            bottom: 30,
            left: 0, 
            right: 0,
            child: Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(30),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2C2C2E).withOpacity(0.8),
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _toolBtn(Icons.format_align_left, () => _updateAlignment(TextAlign.left)),
                        const SizedBox(width: 15),
                        _toolBtn(Icons.format_align_center, () => _updateAlignment(TextAlign.center)),
                        const SizedBox(width: 15),
                        _toolBtn(Icons.format_align_right, () => _updateAlignment(TextAlign.right)),
                        const SizedBox(width: 15),
                        Container(width: 1, height: 20, color: Colors.white24),
                        const SizedBox(width: 15),
                        _toolBtn(Icons.image_outlined, _showCoverMenu),
                        const SizedBox(width: 15),
                        // --- NEW: Smart Paste Button ---
                        _toolBtn(Icons.paste_rounded, _handleSmartPaste),
                        const SizedBox(width: 15),
                        _toolBtn(Icons.check_circle_outline, () { FocusScope.of(context).unfocus(); _saveLocal(); }),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _toolBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Icon(icon, size: 22, color: Colors.white),
    );
  }

  Widget _renderBlock(EditorBlock block, int index) {
    if (block.type == BlockType.noteLink) {
      final data = block.data!;
      final linkedNote = NoteData(
        id: data['id'], serverId: null, title: data['title'] ?? "Untitled", preview: data['preview'] ?? "",
        date: DateTime.tryParse(data['date'] ?? "") ?? DateTime.now(), coverImage: data['cover'] ?? "", rawContent: "", isSynced: true, isDeleted: false
      );

      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 12.0),
        child: GestureDetector(
          onLongPress: () { setState(() { _blocks.removeAt(index); _debouncedSave(); }); },
          child: SizedBox(height: 180, child: NoteCard(note: linkedNote)),
        ),
      );
    }

    // --- NEW: Table Rendering ---
    if (block.type == BlockType.table) {
      return GestureDetector(
        onLongPress: () { 
          // Allow deletion of table by long press
          showDialog(context: context, builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF1C1C1E),
            title: const Text("Delete Table?", style: TextStyle(color: Colors.white)),
            content: const Text("This action cannot be undone.", style: TextStyle(color: Colors.white70)),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
              TextButton(onPressed: () { setState(() => _blocks.removeAt(index)); Navigator.pop(ctx); _debouncedSave(); }, child: const Text("Delete", style: TextStyle(color: Colors.red))),
            ],
          ));
        },
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 16),
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white24),
            borderRadius: BorderRadius.circular(8),
            color: Colors.white10
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                      // Render Rows
                      ...List.generate(block.tableControllers!.length, (rowIndex) {
                        return Row(
                          children: List.generate(block.tableControllers![rowIndex].length, (colIndex) {
                             return Container(
                               width: 100, // Fixed width for cells
                               padding: const EdgeInsets.all(4),
                               decoration: BoxDecoration(border: Border.all(color: Colors.white12)),
                               child: TextField(
                                 controller: block.tableControllers![rowIndex][colIndex],
                                 style: const TextStyle(color: Colors.white),
                                 decoration: const InputDecoration(border: InputBorder.none, isDense: true),
                                 maxLines: null,
                                 onChanged: (_) => _debouncedSave(),
                               ),
                             );
                          }),
                        );
                      }),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              // Controls to add Row/Col
              Row(
                children: [
                   TextButton.icon(
                     icon: const Icon(Icons.add, size: 16, color: Colors.blueAccent),
                     label: const Text("Add Row", style: TextStyle(color: Colors.blueAccent, fontSize: 12)),
                     onPressed: () {
                       setState(() {
                           int cols = block.tableControllers![0].length;
                           List<TextEditingController> newRow = List.generate(cols, (_) => TextEditingController());
                           block.tableControllers!.add(newRow);
                       });
                       _debouncedSave();
                     },
                   ),
                   TextButton.icon(
                     icon: const Icon(Icons.add, size: 16, color: Colors.greenAccent),
                     label: const Text("Add Column", style: TextStyle(color: Colors.greenAccent, fontSize: 12)),
                     onPressed: () {
                       setState(() {
                           for (var row in block.tableControllers!) {
                             row.add(TextEditingController());
                           }
                       });
                       _debouncedSave();
                     },
                   )
                ],
              )
            ],
          ),
        ),
      );
    }

    String prefix = "";
    if (block.type == BlockType.number) {
       int count = 1;
       for (int i = index - 1; i >= 0; i--) {
          if (_blocks[i].type == BlockType.number) count++; else break;
       }
       prefix = "$count.";
    }

    TextStyle textStyle;
    double topPadding = 4;
    double bottomPadding = 4;

    switch (block.type) {
      case BlockType.heading1:
        textStyle = GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w700, color: Colors.white, height: 1.3);
        topPadding = 24;
        bottomPadding = 8;
        break;
      case BlockType.heading2:
        textStyle = GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w600, color: const Color(0xFFE0E0E0), height: 1.3);
        topPadding = 16;
        bottomPadding = 8;
        break;
      case BlockType.bullet:
      case BlockType.number:
      case BlockType.paragraph:
      default:
        textStyle = GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w400, color: const Color(0xFFDDDDDD), height: 1.6);
        break;
    }

    return Padding(
      padding: EdgeInsets.only(top: topPadding, bottom: bottomPadding),
      child: GestureDetector(
        // Allow deleting any block via long press
        onLongPress: () {
              if (_blocks.length > 1) {
                 showModalBottomSheet(context: context, backgroundColor: const Color(0xFF1C1C1E), builder: (_) => Container(
                    height: 100,
                    alignment: Alignment.center,
                    child: ListTile(
                      leading: const Icon(Icons.delete, color: Colors.red),
                      title: const Text("Delete Block", style: TextStyle(color: Colors.red)),
                      onTap: () { Navigator.pop(context); setState(() => _blocks.removeAt(index)); _debouncedSave(); },
                    )
                 ));
              }
        },
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (block.type == BlockType.bullet) 
              Padding(padding: const EdgeInsets.only(top: 10, right: 12), child: Icon(Icons.circle, size: 6, color: Colors.grey[400])),
            if (block.type == BlockType.number) 
              Padding(padding: const EdgeInsets.only(top: 4, right: 12), child: Text(prefix, style: GoogleFonts.inter(color: Colors.grey[400], fontWeight: FontWeight.bold, fontSize: 16))),
            
            Expanded(
              child: TextField(
                controller: block.controller,
                focusNode: block.focusNode,
                textAlign: block.align, 
                onChanged: (val) => _handleBlockChanged(index, val),
                style: textStyle,
                maxLines: null,
                keyboardType: TextInputType.multiline,
                textInputAction: TextInputAction.newline,
                decoration: InputDecoration(
                  isDense: true, 
                  border: InputBorder.none, 
                  contentPadding: EdgeInsets.zero,
                  hintText: "", 
                  hintStyle: TextStyle(color: Colors.grey[800], fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTinyCover(String url) {
     if (url.startsWith('http')) return Image.network(url, fit: BoxFit.cover);
     if (url.startsWith('#')) return Container(color: _hexToColor(url));
     return Container(decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF2C2C2E), Color(0xFF1C1C1E)], begin: Alignment.topLeft, end: Alignment.bottomRight)));
  }
  
  Color _hexToColor(String hex) { try { return Color(int.parse(hex.replaceAll('#', ''), radix: 16) + 0xFF000000); } catch (_) { return const Color(0xFF1C1C1E); } }
}

// ==========================================
// 5. PARSERS, MODELS, WIDGETS
// ==========================================
// --- ADDED table ENUM ---
enum BlockType { paragraph, heading1, heading2, bullet, number, noteLink, table }

class EditorBlock {
  final BlockType type;
  TextEditingController? controller;
  // --- NEW: Table Data Controllers ---
  List<List<TextEditingController>>? tableControllers;
  
  FocusNode focusNode = FocusNode();
  bool hasFocusListener = false;
  TextAlign align;
  Map<String, dynamic>? data;

  EditorBlock({
    required this.type, 
    String text = "", 
    this.data, 
    this.align = TextAlign.left,
    List<List<TextEditingController>>? gridData,
  }) {
    if (type == BlockType.table) {
       // Initialize Table: Default 3x3 if no data provided
       if (gridData != null) {
         tableControllers = gridData;
       } else {
         tableControllers = List.generate(3, (_) => List.generate(3, (_) => TextEditingController()));
       }
    } else if (type != BlockType.noteLink) {
       controller = TextEditingController(text: text);
    }
  }
}

class HtmlParser {
  static List<EditorBlock> parse(String html) {
    List<EditorBlock> blocks = [];
    if (html.isEmpty) return [];

    // ============================================================
    // FIX: Normalize Tiptap's nested <li><p> structure
    // ============================================================
    // Tiptap wraps list content in <p>, which causes the split regex below
    // to break the list item into an empty bullet and a separate paragraph.
    // We remove the inner <p> tags while keeping the <li> wrapper.
    String cleanedHtml = html
        .replaceAll(RegExp(r'<li>\s*<p[^>]*>'), '<li>') // Remove opening <p> inside <li>
        .replaceAll(RegExp(r'</p>\s*</li>'), '</li>')  // Remove closing </p> inside </li>
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n');

    // Split by block-level tags.
    final parts = cleanedHtml.split(RegExp(r'(?=<(p|h1|h2|li|note-link|table))'));

    for (var part in parts) {
      String clean = _decodeHtmlText(part.replaceAll(RegExp(r'<[^>]*>'), ''));
      TextAlign align = TextAlign.left;
      if (part.contains('text-align: center')) align = TextAlign.center;
      if (part.contains('text-align: right')) align = TextAlign.right;
      if (part.contains('text-align: justify')) align = TextAlign.justify;

      if (part.contains("<note-link")) {
        final id = _decodeHtmlText(RegExp(r'id="([^"]*)"').firstMatch(part)?.group(1) ?? "");
        final title = _decodeHtmlText(RegExp(r'title="([^"]*)"').firstMatch(part)?.group(1) ?? "");
        final cover = _decodeHtmlText(RegExp(r'cover="([^"]*)"').firstMatch(part)?.group(1) ?? "");
        final preview = _decodeHtmlText(RegExp(r'preview="([^"]*)"').firstMatch(part)?.group(1) ?? "");
        blocks.add(EditorBlock(type: BlockType.noteLink, data: {"id": id, "title": title, "cover": cover, "preview": preview, "date": DateTime.now().toIso8601String()}));
      } else if (part.contains("<h1")) {
         blocks.add(EditorBlock(type: BlockType.heading1, text: clean, align: align));
      } else if (part.contains("<h2")) {
         blocks.add(EditorBlock(type: BlockType.heading2, text: clean, align: align));
      } else if (part.contains("<li")) {
         final listType = RegExp(r'data-list="([^"]*)"').firstMatch(part)?.group(1);
         blocks.add(EditorBlock(
           type: listType == "number" ? BlockType.number : BlockType.bullet,
           text: clean,
           align: align,
         ));
      } 
      // --- NEW: Parse Table HTML ---
      else if (part.contains("<table")) {
         List<List<TextEditingController>> grid = [];
         final rows = part.split("<tr>");
         for (var rowHtml in rows) {
             if (!rowHtml.contains("td")) continue;
             List<TextEditingController> rowControllers = [];
             final cells = rowHtml.split("<td>");
             for (var cellHtml in cells) {
                 if (cellHtml.contains("</td>")) { // valid cell
                     String cellText = _decodeHtmlText(cellHtml.split("</td>")[0]);
                     rowControllers.add(TextEditingController(text: cellText));
                 }
             }
             if (rowControllers.isNotEmpty) grid.add(rowControllers);
         }
         if (grid.isNotEmpty) blocks.add(EditorBlock(type: BlockType.table, gridData: grid));
      }
      else if (clean.isNotEmpty || part.contains("<p")) {
         blocks.add(EditorBlock(type: BlockType.paragraph, text: clean, align: align));
      }
    }
    return blocks;
  }

  static String stringify(List<EditorBlock> blocks) {
    String html = "";
    for (var block in blocks) {
      String style = "";
      if (block.align == TextAlign.center) style = ' style="text-align: center"';
      if (block.align == TextAlign.right) style = ' style="text-align: right"';
      if (block.align == TextAlign.justify) style = ' style="text-align: justify"';

      if (block.type == BlockType.noteLink) {
        final d = block.data!;
        html += '<note-link id="${_escapeHtmlText(d['id'] ?? "")}" title="${_escapeHtmlText(d['title'] ?? "")}" cover="${_escapeHtmlText(d['cover'] ?? "")}" preview="${_escapeHtmlText(d['preview'] ?? "")}"></note-link>';
      } 
      // --- NEW: Stringify Table ---
      else if (block.type == BlockType.table) {
         html += "<table>";
         for (var row in block.tableControllers!) {
             html += "<tr>";
             for (var cell in row) {
                 html += "<td>${_escapeHtmlText(cell.text).replaceAll('\n', '<br>')}</td>";
             }
             html += "</tr>";
         }
         html += "</table>";
      }
      else {
        String tag = "p";
        if (block.type == BlockType.heading1) tag = "h1";
        if (block.type == BlockType.heading2) tag = "h2";
        if (block.type == BlockType.bullet) tag = "li"; 
        if (block.type == BlockType.number) tag = "li"; 
        final blockText = _escapeHtmlText(block.controller!.text).replaceAll('\n', '<br>');
        final listAttr = block.type == BlockType.number ? ' data-list="number"' : '';
        html += "<$tag$listAttr$style>$blockText</$tag>";
      }
    }
    return html;
  }

  static String previewText(String html) {
    return _decodeHtmlText(
      html
          .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
          .replaceAll(RegExp(r'<[^>]*>'), ''),
    );
  }

  static String _escapeHtmlText(String text) {
    return const HtmlEscape(HtmlEscapeMode.element).convert(text);
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

class DashboardHeader extends StatelessWidget {
  final VoidCallback onCreate;
  const DashboardHeader({super.key, required this.onCreate});
  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      ShaderMask(shaderCallback: (b) => const LinearGradient(colors: [Colors.white, Color(0xFFCCCCCC)], begin: Alignment.topCenter, end: Alignment.bottomCenter).createShader(b), child: const Text("My Workspace", style: TextStyle(fontSize: 42, fontWeight: FontWeight.w800, color: Colors.white, height: 1.1, letterSpacing: -1.0))),
      const SizedBox(height: 8), const Text("Your notes, ideas & thoughts", style: TextStyle(fontSize: 17, color: Color(0xFF8A8A8E))),
      const SizedBox(height: 30),
      
      GestureDetector(
        onTap: onCreate,
        child: Container(
          width: double.infinity, 
          height: 50,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(30),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 20, offset: const Offset(0, 4))],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.add, color: Colors.black, size: 22),
              SizedBox(width: 8),
              Text("New Note", style: TextStyle(color: Colors.black, fontSize: 16, fontWeight: FontWeight.bold))
            ],
          ),
        ),
      ),
    ]);
  }
}

class NoteCard extends StatelessWidget {
  final NoteData note;
  const NoteCard({super.key, required this.note});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: const Color(0xFF1C1C1E), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(0.05)), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 10))]),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(flex: 55, child: Stack(fit: StackFit.expand, children: [
          _buildCover(),
          Container(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [Colors.black.withOpacity(0.4), Colors.transparent]))),
        ])),
        Expanded(flex: 45, child: Padding(padding: const EdgeInsets.all(12.0), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(note.title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: Colors.white), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 4),
          Expanded(child: Text(note.preview, style: const TextStyle(fontSize: 14, color: Color(0xFF8A8A8E), height: 1.4), maxLines: 2, overflow: TextOverflow.ellipsis)),
          const SizedBox(height: 4),
          Text(DateFormat('d MMM yyyy').format(note.date), style: const TextStyle(fontSize: 12, color: Color(0xFF636366), fontWeight: FontWeight.w500)),
        ]))),
      ]),
    );
  }
  Widget _buildCover() {
    if (note.coverImage.startsWith('http')) return Image.network(note.coverImage, fit: BoxFit.cover);
    if (note.coverImage.startsWith('#')) return Container(color: _hexToColor(note.coverImage));
    return Container(decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF2C2C2E), Color(0xFF1C1C1E)], begin: Alignment.topLeft, end: Alignment.bottomRight)));
  }
  Color _hexToColor(String hex) { try { return Color(int.parse(hex.replaceAll('#', ''), radix: 16) + 0xFF000000); } catch (_) { return const Color(0xFF1C1C1E); } }
}

class SidebarContent extends StatelessWidget {
  const SidebarContent({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(color: const Color(0xFF121214), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 60), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text("BROMINE / WORKSPACE", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF636366), letterSpacing: 0.5)), const SizedBox(height: 20), const _SidebarItem(icon: Icons.article_outlined, label: "All Notes", isActive: true), const _SidebarItem(icon: Icons.star_border, label: "Favorites"), const _SidebarItem(icon: Icons.delete_outline, label: "Trash")]));
  }
}

class _SidebarItem extends StatelessWidget {
  final IconData icon; final String label; final bool isActive;
  const _SidebarItem({required this.icon, required this.label, this.isActive = false});
  @override
  Widget build(BuildContext context) {
    return Container(margin: const EdgeInsets.only(bottom: 4), padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12), decoration: BoxDecoration(color: isActive ? Colors.white.withOpacity(0.1) : Colors.transparent, borderRadius: BorderRadius.circular(8)), child: Row(children: [Icon(icon, size: 20, color: isActive ? Colors.white : const Color(0xFF8A8A8E)), const SizedBox(width: 12), Text(label, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: isActive ? Colors.white : const Color(0xFF8A8A8E)))]));
  }
}

class BackgroundGlow extends StatelessWidget {
  const BackgroundGlow({super.key});
  @override
  Widget build(BuildContext context) {
    return Stack(children: [Positioned(top: -100, left: 0, right: 0, child: Center(child: Container(width: MediaQuery.of(context).size.width * 0.8, height: 400, decoration: BoxDecoration(gradient: RadialGradient(colors: [const Color(0xFF6464FF).withOpacity(0.15), const Color(0xFFFF6464).withOpacity(0.1), Colors.transparent], radius: 1.5, center: Alignment.topCenter))))), BackdropFilter(filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80), child: Container(color: Colors.transparent))]);
  }
}

class NoteData {
  final String id; final String? serverId; final String title; final String preview; final DateTime date; final String coverImage; final String rawContent; final bool isSynced; final bool isDeleted;
  
  NoteData({required this.id, required this.serverId, required this.title, required this.preview, required this.date, required this.coverImage, required this.rawContent, required this.isSynced, required this.isDeleted});
  
  NoteData copyWith({String? title, String? rawContent, String? preview, String? coverImage, DateTime? date, bool? isSynced, String? serverId}) {
    return NoteData(
      id: id,
      serverId: serverId ?? this.serverId,
      title: title ?? this.title,
      rawContent: rawContent ?? this.rawContent,
      preview: preview ?? this.preview,
      coverImage: coverImage ?? this.coverImage,
      date: date ?? this.date,
      isSynced: isSynced ?? this.isSynced,
      isDeleted: isDeleted
    );
  }

  factory NoteData.fromMap(Map<String, dynamic> map) {
    return NoteData(
      id: map['id'],
      serverId: map['server_id'], 
      title: map['title'],
      rawContent: map['content'],
      preview: HtmlParser.previewText(map['content'] ?? ""),
      coverImage: map['coverImage'],
      date: DateTime.parse(map['createdAt']),
      isSynced: map['isSynced'] == 1,
      isDeleted: map['isDeleted'] == 1,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'server_id': serverId, 
      'title': title,
      'content': rawContent,
      'coverImage': coverImage,
      'createdAt': date.toIso8601String(),
      'isSynced': isSynced ? 1 : 0,
      'isDeleted': isDeleted ? 1 : 0,
    };
  }

  factory NoteData.fromJson(Map<String, dynamic> json) {
    String raw = json['content'] ?? "";
    return NoteData(
      id: json['_id'], 
      serverId: json['_id'], 
      title: json['title'] ?? "Untitled", 
      preview: HtmlParser.previewText(raw), 
      rawContent: raw,
      coverImage: json['coverImage'] ?? "",
      date: DateTime.tryParse(json['createdAt'] ?? "") ?? DateTime.now(),
      isSynced: true,
      isDeleted: false
    );
  }
}
