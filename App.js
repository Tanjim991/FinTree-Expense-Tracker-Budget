import React, { useState, useEffect, useRef } from 'react';
import { Clipboard } from 'react-native';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Animated, Alert, Image, KeyboardAvoidingView, Platform, StatusBar, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIREBASE
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCtcQEMr0xP5V-fwyY6CupnM3ewaz-sCE0",
  authDomain: "fintree-a0153.firebaseapp.com",
  projectId: "fintree-a0153",
  storageBucket: "fintree-a0153.firebasestorage.app",
  messagingSenderId: "1044925851763",
  appId: "1:1044925851763:web:2412c0097d43015c13a206",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const KEY = '@fintree_vault_v1';
const DEF = [
  { id: '1', name: 'Factory Expenses', image: null, children: [], transactions: [] },
  { id: '2', name: 'Personal Expenses', image: null, children: [], transactions: [] },
  { id: '3', name: 'Family & Others', image: null, children: [], transactions: [] },
];

const findNode = (nodes, id) => {
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findNode(n.children || [], id);
    if (f) return f;
  }
  return null;
};

const updateNode = (nodes, id, fn) =>
  nodes.map(n => n.id === id ? fn(n) : { ...n, children: updateNode(n.children || [], id, fn) });

const deleteNode = (nodes, id) =>
  nodes.filter(n => n.id !== id).map(n => ({ ...n, children: deleteNode(n.children || [], id) }));

const calcTotal = (node) => {
  let inc = 0, exp = 0;
  (node.transactions || []).forEach(tx => { if (tx.type === 'income') inc += tx.amount; else exp += tx.amount; });
  (node.children || []).forEach(c => { const t = calcTotal(c); inc += t.inc; exp += t.exp; });
  return { inc, exp, net: inc - exp };
};

const fmt = n => {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + ' Cr';
  if (n >= 100000) return (n / 100000).toFixed(1) + ' L';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toFixed(0);
};

const getDate = () => {
  const d = new Date();
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}, ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
};

function AppInner() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const [unlocked, setUnlocked] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const [data, setData] = useState(DEF);
  const [stack, setStack] = useState([]); // array of node ids = navigation path
  const [newName, setNewName] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [txImage, setTxImage] = useState(null);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');

  const [showSettings, setShowSettings] = useState(false);
  const [importText, setImportText] = useState('');

  // AUTH LISTENER
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ALWAYS load locally first
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => {
      if (v) { setData(JSON.parse(v)); return; }
      AsyncStorage.getItem('@fintree_vault_data').then(old => {
        if (!old) return;
        try {
          const oldCats = JSON.parse(old);
          const migrated = oldCats.map(cat => ({
            id: cat.id, name: cat.name, image: cat.image || null,
            children: (cat.subCategories || []).map(sub => ({
              id: sub.id, name: sub.name, image: sub.image || null,
              children: [], transactions: sub.transactions || []
            })),
            transactions: []
          }));
          setData(migrated);
        } catch (e) {}
      });
    }).catch(() => {});
  }, []);

  // AUTO-SAVE locally only
  useEffect(() => { AsyncStorage.setItem(KEY, JSON.stringify(data)); }, [data]);

  const handleAuth = async () => {
    if (!email || !password) { Alert.alert('Error', 'Enter email and password.'); return; }
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
      setEmail(''); setPassword('');
    } catch (e) { Alert.alert('Login Error', e.message); }
  };

  const saveToCloud = async () => {
    if (!user) { Alert.alert('Not Logged In', 'Please login first to save to cloud.'); return; }
    try {
      await setDoc(doc(db, 'users', user.uid), { vault: data }, { merge: true });
      Alert.alert('☁️ Saved!', 'All your data has been backed up to the cloud successfully!');
    } catch (e) { Alert.alert('Error', 'Could not save to cloud: ' + e.message); }
  };

  const restoreFromCloud = async () => {
    if (!user) { Alert.alert('Not Logged In', 'Please login first to restore from cloud.'); return; }
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists() && snap.data().vault) {
        setData(snap.data().vault);
        Alert.alert('📥 Restored!', 'Your cloud data has been restored to this phone!');
      } else { Alert.alert('No Data', 'No cloud backup found for this account.'); }
    } catch (e) { Alert.alert('Error', 'Could not restore: ' + e.message); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Logout', onPress: () => { signOut(auth); setShowSettings(false); } }
    ]);
  };

  useEffect(() => {
    if (unlocked) Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [unlocked]);

  const exportData = async () => {
    try {
      await Clipboard.setString(JSON.stringify(data));
      Alert.alert('✅ Exported!', 'All data copied to clipboard. Paste it somewhere safe (Notes app, WhatsApp to yourself, etc.) before uninstalling.');
    } catch (e) { Alert.alert('Error', 'Could not copy data.'); }
  };

  const importData = () => {
    if (!importText.trim()) { Alert.alert('Empty', 'Paste your exported data first.'); return; }
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) throw new Error('Invalid');
      setData(parsed);
      setImportText('');
      setShowSettings(false);
      Alert.alert('✅ Imported!', 'All your data has been restored successfully!');
    } catch (e) { Alert.alert('❌ Error', 'Invalid data. Make sure you pasted the correct exported text.'); }
  };

  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Allow gallery access.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5 });
    if (!r.canceled) setter(r.assets[0].uri);
  };

  const currentNode = stack.length > 0 ? findNode(data, stack[stack.length - 1]) : null;
  const currentList = currentNode ? (currentNode.children || []) : data;
  const currentTx = currentNode ? (currentNode.transactions || []) : [];

  const getMonthKey = (dateStr) => {
    if (!dateStr) return '';
    const p = dateStr.split(' ');
    return `${p[1]} ${p[2]?.replace(',', '')}`;
  };

  const getAllMonths = () => {
    const months = new Set();
    const collect = (nodes) => nodes.forEach(n => {
      (n.transactions || []).forEach(tx => { if (tx.date) months.add(getMonthKey(tx.date)); });
      collect(n.children || []);
    });
    collect(data);
    return ['all', ...Array.from(months).reverse()];
  };

  const calcRootTotal = () => {
    let inc = 0, exp = 0, count = 0;
    const collect = (nodes) => nodes.forEach(n => {
      (n.transactions || []).forEach(tx => {
        if (filterMonth !== 'all' && getMonthKey(tx.date) !== filterMonth) return;
        count++;
        if (tx.type === 'income') inc += tx.amount; else exp += tx.amount;
      });
      collect(n.children || []);
    });
    collect(data);
    return { inc, exp, net: inc - exp, count };
  };

  const addNode = () => {
    if (!newName.trim()) return;
    const newNode = { id: Date.now().toString(), name: newName.trim(), image: newImage, children: [], transactions: [] };
    if (stack.length === 0) {
      setData([...data, newNode]);
    } else {
      const pid = stack[stack.length - 1];
      setData(updateNode(data, pid, n => ({ ...n, children: [...(n.children || []), newNode] })));
    }
    setNewName(''); setNewImage(null);
  };

  const deleteItem = (id) => {
    Alert.alert('Delete?', 'All data inside will be lost!', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setData(deleteNode(data, id)) },
    ]);
  };

  const addTransaction = (type) => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    if (stack.length === 0) { Alert.alert('Select a sub-category', 'Go inside a category first.'); return; }
    const pid = stack[stack.length - 1];
    const tx = { id: Date.now().toString(), type, amount: parseFloat(amount), note: note.trim() || (type === 'income' ? 'Income' : 'Expense'), image: txImage, date: getDate() };
    setData(updateNode(data, pid, n => ({ ...n, transactions: [...(n.transactions || []), tx] })));
    setAmount(''); setNote(''); setTxImage(null);
  };

  const deleteTransaction = (txId) => {
    const pid = stack[stack.length - 1];
    setData(updateNode(data, pid, n => ({ ...n, transactions: n.transactions.filter(t => t.id !== txId) })));
  };

  const filteredList = search ? currentList.filter(n => n.name.toLowerCase().includes(search.toLowerCase())) : currentList;
  const filteredTx = currentTx.filter(tx => filterMonth === 'all' || getMonthKey(tx.date) === filterMonth);

  // LOCK SCREEN
  if (!unlocked) return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />
      <View style={s.lockC}>
        <Text style={s.lockIcon}>🌳</Text>
        <Text style={s.lockTitle}>FINTREE VAULT</Text>
        <Text style={s.lockSub}>INTELLIGENT FINANCIAL HIERARCHY</Text>
        <TouchableOpacity style={s.lockBtn} onPress={() => setUnlocked(true)}>
          <Text style={s.lockBtnTxt}>INITIATE SYSTEM</Text>
        </TouchableOpacity>
        <Text style={s.lockDev}>Built with ❤️ & AI · FinTree Lab</Text>
      </View>
    </SafeAreaView>
  );

  const months = getAllMonths();
  const { inc: tInc, exp: tExp, net: tNet, count } = stack.length === 0 ? calcRootTotal() : (() => { const t = calcTotal(currentNode); return { inc: t.inc, exp: t.exp, net: t.net, count: currentTx.length }; })();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[s.main, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* HEADER */}
          {stack.length === 0 ? (
            <>
              <View style={s.titleRow}>
            <View style={{flex:1}}>
              <Text style={s.hTitle}>FINTREE</Text>
              <Text style={s.hWelcome}>Welcome to FinTree</Text>
            </View>
            <TouchableOpacity style={s.gearBtn} onPress={() => setShowSettings(true)}>
              <Text style={s.gearIco}>⚙️</Text>
            </TouchableOpacity>
          </View>
            </>
          ) : (
            <View style={s.breadRow}>
              <TouchableOpacity style={s.backBtn} onPress={() => { setStack(stack.slice(0, -1)); setSearch(''); }}>
                <Text style={s.backTxt}>← BACK</Text>
              </TouchableOpacity>
              <View style={s.breadNode}>
                {currentNode?.image && <Image source={{ uri: currentNode.image }} style={s.breadImg} />}
                <Text style={s.hTitleSm} numberOfLines={1}>{currentNode?.name?.toUpperCase()}</Text>
              </View>
            </View>
          )}

          {/* MONTH FILTER */}
          {months.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
              {months.map(m => (
                <TouchableOpacity key={m} style={[s.chip, filterMonth === m && s.chipActive]} onPress={() => setFilterMonth(m)}>
                  <Text style={[s.chipTxt, filterMonth === m && s.chipActiveTxt]}>{m === 'all' ? 'ALL TIME' : m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* SUMMARY CARD */}
          <View style={s.card}>
            <Text style={s.cardLbl}>⬡ {stack.length === 0 ? 'TOTAL' : currentNode?.name?.toUpperCase()} ({count} entries)</Text>
            <View style={s.row}>
              <View style={s.statBox}><Text style={s.statLbl}>INCOME</Text><Text style={[s.statVal, { color: '#4ade80' }]}>৳{fmt(tInc)}</Text></View>
              <View style={s.div} />
              <View style={s.statBox}><Text style={s.statLbl}>EXPENSE</Text><Text style={[s.statVal, { color: '#f87171' }]}>৳{fmt(tExp)}</Text></View>
            </View>
            <View style={s.netBox}>
              <Text style={s.statLbl}>NET BALANCE</Text>
              <Text style={[s.netVal, { color: tNet >= 0 ? '#4ade80' : '#f87171' }]}>{tNet >= 0 ? '▲ +' : '▼ '}৳{fmt(Math.abs(tNet))}</Text>
            </View>
          </View>

          {/* SEARCH */}
          {currentList.length > 3 && (
            <TextInput style={s.searchInp} placeholder="🔍 Search..." placeholderTextColor="#555" value={search} onChangeText={setSearch} />
          )}

          {/* CHILDREN LIST */}
          {filteredList.length > 0 && <Text style={s.secTitle}>{stack.length === 0 ? '▸ CATEGORIES' : '▸ SUB-CATEGORIES'}</Text>}
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {filteredList.map(item => {
              const t = calcTotal(item);
              return (
                <View key={item.id} style={s.listRow}>
                  <TouchableOpacity style={[s.listItem, { flex: 1 }]} onPress={() => { setStack([...stack, item.id]); setSearch(''); }}>
                    <View style={s.rowC}>
                      {item.image ? <Image source={{ uri: item.image }} style={s.thumb} /> : <View style={s.thumbPlaceholder}><Text style={{ fontSize: 14 }}>📁</Text></View>}
                      <View>
                        <Text style={s.listTxt}>{item.name}</Text>
                        <Text style={[s.listSub, { color: t.net >= 0 ? '#4ade80' : '#f87171' }]}>৳{fmt(Math.abs(t.net))}</Text>
                      </View>
                    </View>
                    <Text style={s.arrow}>→</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.delBtn} onPress={() => deleteItem(item.id)}>
                    <Text style={s.delTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* TRANSACTIONS (shown on any node) */}
            {stack.length > 0 && filteredTx.length > 0 && <Text style={s.secTitle}>▸ TRANSACTIONS</Text>}
            {stack.length > 0 && [...filteredTx].reverse().map(tx => (
              <View key={tx.id} style={s.txItem}>
                <View style={s.txL}>
                  <Text style={s.txNote}>{tx.note}</Text>
                  <Text style={s.txDate}>{tx.date}</Text>
                  {tx.image && <Image source={{ uri: tx.image }} style={s.receipt} />}
                </View>
                <View style={s.txR}>
                  <Text style={[s.txAmt, { color: tx.type === 'income' ? '#4ade80' : '#f87171' }]}>{tx.type === 'income' ? '+' : '-'}৳{fmt(tx.amount)}</Text>
                  <TouchableOpacity onPress={() => deleteTransaction(tx.id)}><Text style={s.txDel}>✕</Text></TouchableOpacity>
                </View>
              </View>
            ))}
            {stack.length > 0 && filteredList.length === 0 && filteredTx.length === 0 && (
              <Text style={s.empty}>No entries yet. Add sub-categories or transactions below.</Text>
            )}
          </ScrollView>

          {/* ADD NODE */}
          <View style={s.addBlock}>
            <View style={s.inputRow}>
              <TouchableOpacity style={s.photoBtn} onPress={() => pickImage(setNewImage)}>
                {newImage ? <Image source={{ uri: newImage }} style={s.photoPrev} /> : <Text style={s.photoIco}>📷</Text>}
              </TouchableOpacity>
              <TextInput style={s.inp} placeholder={stack.length === 0 ? '+ New Category' : '+ New Sub-Category'} placeholderTextColor="#555" value={newName} onChangeText={setNewName} returnKeyType="done" onSubmitEditing={addNode} />
              <TouchableOpacity style={s.addBtn} onPress={addNode}><Text style={s.addTxt}>ADD</Text></TouchableOpacity>
            </View>

            {/* ADD TRANSACTION (only when inside a node) */}
            {stack.length > 0 && (
              <>
                <View style={s.row}>
                  <TouchableOpacity style={s.photoBtnL} onPress={() => pickImage(setTxImage)}>
                    {txImage ? <Image source={{ uri: txImage }} style={s.photoPrevL} /> : <Text style={s.photoTxtL}>📷 Receipt</Text>}
                  </TouchableOpacity>
                  <TextInput style={[s.inpFull, { flex: 1 }]} placeholder="Amount (৳)" placeholderTextColor="#555" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                </View>
                <TextInput style={s.inpFull} placeholder="Note (e.g. bKash, School Fee)" placeholderTextColor="#555" value={note} onChangeText={setNote} />
                <View style={s.row}>
                  <TouchableOpacity style={[s.actBtn, { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: '#4ade80' }]} onPress={() => addTransaction('income')}>
                    <Text style={[s.actTxt, { color: '#4ade80' }]}>▲ INCOME</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actBtn, { backgroundColor: 'rgba(248,113,113,0.15)', borderColor: '#f87171' }]} onPress={() => addTransaction('expense')}>
                    <Text style={[s.actTxt, { color: '#f87171' }]}>▼ EXPENSE</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
      {/* SETTINGS MODAL */}
      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>⚙️ Settings</Text>

            <Text style={s.modalSub}>☁️ CLOUD BACKUP</Text>
            {!user ? (
              <View style={{gap:10}}>
                <Text style={{color:'#666',fontSize:11,marginBottom:5}}>Login to save/restore your data from anywhere</Text>
                <TextInput style={s.authInp} placeholder="Email" placeholderTextColor="#555" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={s.authInp} placeholder="Password" placeholderTextColor="#555" value={password} onChangeText={setPassword} secureTextEntry />
                <TouchableOpacity style={s.authBtn} onPress={handleAuth}>
                  <Text style={s.authBtnTxt}>{isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                  <Text style={s.authSwitch}>{isLogin ? "No account? Sign Up" : "Have account? Login"}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{gap:10}}>
                <Text style={{color:'#4ade80',fontSize:12}}>✅ Logged in as {user.email}</Text>
                <TouchableOpacity style={s.exportBtn} onPress={saveToCloud}>
                  <Text style={s.exportTxt}>☁️ Save Data to Cloud</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.exportBtn,{borderColor:'#ec4899'}]} onPress={restoreFromCloud}>
                  <Text style={[s.exportTxt,{color:'#ec4899'}]}>📥 Restore Data from Cloud</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.importBtn,{backgroundColor:'rgba(248,113,113,0.1)'}]} onPress={handleLogout}>
                  <Text style={[s.importTxt,{color:'#f87171'}]}>🚪 Logout</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{height:1,backgroundColor:'rgba(255,255,255,0.08)',marginVertical:18}}/>
            <Text style={s.modalSub}>💾 LOCAL BACKUP (NO INTERNET)</Text>
            <TouchableOpacity style={s.exportBtn} onPress={exportData}>
              <Text style={s.exportTxt}>📋 Copy All Data to Clipboard</Text>
            </TouchableOpacity>
            <Text style={s.modalSub2}>To restore: paste your exported text below</Text>
            <TextInput
              style={s.importInp}
              placeholder="Paste exported data here..."
              placeholderTextColor="#444"
              multiline
              value={importText}
              onChangeText={setImportText}
            />
            <TouchableOpacity style={s.importBtn} onPress={importData}>
              <Text style={s.importTxt}>✅ Restore Data</Text>
            </TouchableOpacity>

            <View style={{height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20}} />
            
            <TouchableOpacity style={[s.importBtn, {backgroundColor: 'rgba(248,113,113,0.1)'}]} onPress={handleLogout}>
              <Text style={[s.importTxt, {color: '#f87171'}]}>🚪 Logout ({user?.email})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.closeBtn} onPress={() => setShowSettings(false)}>
              <Text style={s.closeTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><AppInner /></SafeAreaProvider>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050510' },
  lockC: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  lockIcon: { fontSize: 60, color: '#6366f1', marginBottom: 20 },
  lockTitle: { color: '#6366f1', fontSize: 28, fontWeight: '900', letterSpacing: 4, marginBottom: 8, textAlign: 'center' },
  lockSub: { color: '#ec4899', fontSize: 13, letterSpacing: 3, marginBottom: 50 },
  lockBtn: { borderColor: '#6366f1', borderWidth: 2, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, backgroundColor: 'rgba(99,102,241,0.12)' },
  lockBtnTxt: { color: '#fff', fontSize: 17, fontWeight: 'bold', letterSpacing: 2 },
  lockDev: { color: '#333', position: 'absolute', bottom: 30, fontSize: 11, letterSpacing: 1 },
  authC: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  authSub: { color: '#888', fontSize: 13, marginBottom: 40, letterSpacing: 1 },
  authBox: { width: '100%', gap: 15 },
  authInp: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 15 },
  authBtn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  authBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  authSwitch: { color: '#6366f1', textAlign: 'center', fontSize: 13 },
  main: { flex: 1, padding: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  gearBtn: { padding: 10 },
  gearIco: { fontSize: 22 },
  hTitle: { color: '#fff', fontSize: 19, fontWeight: 'bold', letterSpacing: 2, marginBottom: 4 },
  hTitleSm: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1, flex: 1 },
  hWelcome: { color: '#ec4899', fontSize: 12, marginBottom: 14 },
  breadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  breadNode: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  breadImg: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#ec4899' },
  backBtn: { backgroundColor: 'rgba(236,72,153,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  backTxt: { color: '#ec4899', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  filterRow: { maxHeight: 36, marginBottom: 10 },
  chip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 7, backgroundColor: 'rgba(255,255,255,0.03)' },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipTxt: { color: '#888', fontSize: 10, fontWeight: 'bold' },
  chipActiveTxt: { color: '#fff' },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.35)' },
  cardLbl: { color: '#a5b4fc', fontSize: 9, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  rowC: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  div: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  statBox: { flex: 1, alignItems: 'center' },
  statLbl: { color: '#555', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, marginBottom: 3 },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  netBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  netVal: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  secTitle: { color: '#6366f1', fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 6, marginTop: 4 },
  list: { flex: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7, gap: 6 },
  listItem: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 13, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  listTxt: { color: '#e5e5e5', fontSize: 14, fontWeight: '500' },
  listSub: { fontSize: 11, marginTop: 2 },
  arrow: { color: '#ec4899', fontSize: 16 },
  thumb: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#ec4899' },
  thumbPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(99,102,241,0.2)', justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#444', fontStyle: 'italic', textAlign: 'center', marginTop: 30, fontSize: 12 },
  delBtn: { backgroundColor: 'rgba(248,113,113,0.12)', borderRadius: 8, width: 34, height: 34, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)' },
  delTxt: { color: '#f87171', fontSize: 13, fontWeight: 'bold' },
  searchInp: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 11, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 13, marginBottom: 8 },
  addBlock: { gap: 7, paddingTop: 8, paddingBottom: 6 },
  inputRow: { flexDirection: 'row', gap: 7 },
  inp: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 13 },
  inpFull: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 13 },
  addBtn: { backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 10 },
  addTxt: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  photoBtn: { width: 46, height: 46, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  photoIco: { fontSize: 18 },
  photoPrev: { width: '100%', height: '100%', borderRadius: 10 },
  photoBtnL: { height: 46, flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ec4899', borderStyle: 'dashed' },
  photoTxtL: { color: '#ec4899', fontSize: 11, fontWeight: 'bold' },
  photoPrevL: { width: '100%', height: '100%', borderRadius: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#0a0a1a', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  modalSub: { color: '#666', fontSize: 12, marginBottom: 20 },
  modalSub2: { color: '#666', fontSize: 12, marginBottom: 10, marginTop: 20 },
  exportBtn: { backgroundColor: 'rgba(99,102,241,0.15)', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#6366f1' },
  exportTxt: { color: '#6366f1', fontWeight: 'bold', textAlign: 'center' },
  importInp: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, color: '#aaa', fontSize: 12, height: 100, textAlignVertical: 'top' },
  importBtn: { backgroundColor: '#6366f1', padding: 15, borderRadius: 12, marginTop: 10, alignItems: 'center' },
  importTxt: { color: '#fff', fontWeight: 'bold' },
  closeBtn: { marginTop: 20, alignItems: 'center' },
  closeTxt: { color: '#444', fontWeight: 'bold' },
  txItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 8 },
  txL: { flex: 1, gap: 2 },
  txR: { alignItems: 'flex-end', gap: 5 },
  txNote: { color: '#ccc', fontSize: 13 },
  txDate: { color: '#444', fontSize: 9 },
  txAmt: { fontSize: 13, fontWeight: 'bold' },
  txDel: { color: '#f87171', fontSize: 12 },
  receipt: { width: 65, height: 65, borderRadius: 5, marginTop: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  actTxt: { fontWeight: 'bold', letterSpacing: 1, fontSize: 12 },
});
