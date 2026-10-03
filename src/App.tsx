import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api, auth } from './api';

type Row = {
  id: string;
  announcement_no: string;
  announcement_date: string;
  subject: string;
  amount: number | null;
  budget_year: number | null;
  project_no: string | null;
  note: string | null;
  inventory_no: string | null;
  inventory_date: string | null;
  department: string | null;
  status: string | null;
  source_key?: string | null;
  updated_at?: string;
  deleted?: boolean;
  sort_date?: string;
  sort_no?: string;
  sort_time?: string;
  sort_waiting?: boolean;
};

type FormData = {
  announcement_no: string;
  announcement_date: string;
  subject: string;
  amount: string;
  budget_year: string;
  project_no: string;
  note: string;
  inventory_no: string;
  inventory_date: string;
  department: string;
  status: string;
};

type SignedInUser = { userId: string; name?: string; email?: string };
const seedData: Omit<Row, 'id'>[] = [];
const seeds: Row[] = seedData.map(r => ({ ...r, id: 'seed-' + r.announcement_date.slice(0, 4) + '-' + r.announcement_no }));
const emptyForm = (): FormData => ({
  announcement_no: '',
  announcement_date: '',
  subject: '',
  amount: '',
  budget_year: '2570',
  project_no: '',
  note: '',
  inventory_no: '',
  inventory_date: '',
  department: '',
  status: '',
});
const formFromRow = (r: Row): FormData => ({
  announcement_no: r.announcement_no,
  announcement_date: r.announcement_date,
  subject: r.subject,
  amount: r.amount == null ? '' : String(r.amount),
  budget_year: r.budget_year == null ? '' : String(r.budget_year),
  project_no: r.project_no || '',
  note: r.note || '',
  inventory_no: r.inventory_no || '',
  inventory_date: r.inventory_date || '',
  department: r.department || '',
  status: r.status || '',
});
const thaiDate = (s: string) => {
  if (!s) return '-';
  const d = new Date(s + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
};
const money = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isPlaceholder = (r: Row) => !r.id.startsWith('seed-') && !r.source_key && (r.announcement_no === '000' || r.announcement_no === '001');
const isWaiting = (r: Row) => !r.announcement_no || isPlaceholder(r);
function mergeRows(saved: Row[]): Row[] {
  const overridden = new Set(saved.map(r => r.source_key).filter(Boolean));
  return [...saved.filter(r => !r.deleted), ...seeds.filter(r => !overridden.has(r.id.slice(5)))]
    .sort((a, b) => {
      // Numbered announcements are always sorted by current number, highest first.
      // Editing another field does not move a row; changing its number places it
      // at the correct numeric position. Drafts and temporary numbers stay last.
      const aWaiting = isWaiting(a);
      const bWaiting = isWaiting(b);
      if (aWaiting !== bWaiting) return aWaiting ? 1 : -1;
      if (aWaiting && bWaiting) {
        const aOriginal = a.sort_time || a.updated_at || '';
        const bOriginal = b.sort_time || b.updated_at || '';
        return bOriginal.localeCompare(aOriginal) || a.id.localeCompare(b.id);
      }
      const aYear = Number(a.announcement_date.slice(0, 4)) || 0;
      const bYear = Number(b.announcement_date.slice(0, 4)) || 0;
      return bYear - aYear ||
        Number(b.announcement_no) - Number(a.announcement_no) ||
        a.id.localeCompare(b.id);
    });
}
function App() {
  const [saved, setSaved] = useState<Row[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [q, setQ] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [message, setMessage] = useState('');

  async function loadRows(token?: string) {
    if (!token) setLoading(true);
    try {
      const response = await api.get('/api/announcements' + (token ? '?nextToken=' + encodeURIComponent(token) : ''));
      const payload = response.data as { items: Row[]; nextToken?: string };
      setSaved(previous => token ? [...previous, ...payload.items] : payload.items);
      setNextToken(payload.nextToken || null);
      setListError('');
    } catch {
      setListError('ไม่สามารถโหลดข้อมูลที่เพิ่มไว้ได้ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadRows();
    if (auth.isSignedIn()) void auth.getUser().then(value => setUser(value)).catch(() => setUser(null));
  }, []);
  const rows = useMemo(() => mergeRows(saved), [saved]);
  const filtered = useMemo(
    () => rows.filter(r => Object.values(r).join(' ').toLocaleLowerCase().includes(q.trim().toLocaleLowerCase())),
    [q, rows]
  );
  const total = rows.reduce((sum, r) => sum + (r.amount || 0), 0);

  async function ensureSignedIn(): Promise<boolean> {
    if (user) return true;
    setSigningIn(true);
    setMessage('');
    try {
      const result = await auth.signIn();
      setUser(result.user);
      return true;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'popup_blocked') setMessage('เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ กรุณาอนุญาต Pop-up แล้วลองใหม่');
      else if (code !== 'popup_closed') setMessage('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
      return false;
    } finally {
      setSigningIn(false);
    }
  }
  async function startAdd() {
    if (!await ensureSignedIn()) return;
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setMessage('');
    setFormOpen(true);
  }
  async function startEdit(r: Row) {
    if (!await ensureSignedIn()) return;
    setEditing(r);
    setForm(formFromRow(r));
    setFormError('');
    setMessage('');
    setFormOpen(true);
  }
  async function startDelete(r: Row) {
    if (!await ensureSignedIn()) return;
    if (!window.confirm('ยืนยันลบรายการ: ' + (r.announcement_no || 'รอเลข') + ' — ' + r.subject + ' ?')) return;
    setDeletingId(r.id);
    setMessage('');
    try {
      await api.delete('/api/announcements/' + encodeURIComponent(r.id));
      await loadRows();
      setMessage('ลบรายการที่เลือกเรียบร้อยแล้ว');
    } catch {
      setMessage('ลบไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setDeletingId(null);
    }
  }
  function field(key: keyof FormData, value: string) {
    setForm(old => ({ ...old, [key]: value }));
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    const no = form.announcement_no.trim();
    if (!form.subject.trim()) {
      setFormError('กรุณากรอกเรื่องหรือชื่อรายการก่อนบันทึก');
      return;
    }
    if (no && !form.announcement_date) {
      setFormError('เมื่อใส่เลขประกาศแล้ว กรุณาระบุวันที่ประกาศด้วย');
      return;
    }
    if (no && rows.some(r => r.id !== editing?.id && r.announcement_no === no && r.announcement_date.slice(0, 4) === form.announcement_date.slice(0, 4))) {
      setFormError('เลขประกาศนี้มีอยู่แล้วในปีที่เลือก กรุณาตรวจสอบก่อนบันทึก');
      return;
    }
    const body = {
      announcement_no: no,
      announcement_date: form.announcement_date,
      subject: form.subject.trim(),
      amount: form.amount.trim() ? Number(form.amount) : null,
      budget_year: form.budget_year.trim() ? Number(form.budget_year) : null,
      project_no: form.project_no.trim() || null,
      note: form.note.trim() || null,
      inventory_no: form.inventory_no.trim() || null,
      inventory_date: form.inventory_date || null,
      department: form.department.trim() || null,
      status: form.status.trim() || null,
    };
    setSaving(true);
    try {
      if (editing) await api.put('/api/announcements/' + encodeURIComponent(editing.id), body);
      else await api.post('/api/announcements', body);
      setFormOpen(false);
      setEditing(null);
      setMessage(!no ? 'บันทึกรายการรอออกเลขเรียบร้อยแล้ว' : editing?.announcement_no !== no && editing ? 'เปลี่ยนเลขประกาศเป็น ' + no + ' โดยเก็บรายการเดิมไว้เรียบร้อยแล้ว' : editing ? 'แก้ไขข้อมูลเรียบร้อยแล้ว' : 'เพิ่มรายการเลข ' + no + ' เรียบร้อยแล้ว');
      await loadRows();
    } catch (errorValue) {
      const response = errorValue as { response?: { data?: { error?: string; message?: string } } };
      setFormError(response.response?.data?.error || response.response?.data?.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่ และตรวจสอบว่าเลขประกาศไม่ซ้ำ');
    } finally {
      setSaving(false);
    }
  }
  return (
    <main>
      <header>
        <div>
          <h1>ทะเบียนเลขประกาศจังหวัด</h1>
          <p>กลุ่มงานพัสดุ โรงพยาบาลอุตรดิตถ์ · ระบบทดลอง Render · ข้อมูลตัวอย่างเท่านั้น ไม่ใช่ Master จริง</p>
        </div>
        <div className='headerActions'>
          <span className='badge'>ทุกคนเปิดดูได้</span>
          {user ? (
            <button className='headerButton' type='button' onClick={() => { void auth.signOut().then(() => setUser(null)); }}>
              ออกจากระบบ ({user.name || user.email || 'ผู้แก้ไข'})
            </button>
          ) : (
            <button className='headerButton' type='button' disabled={signingIn} onClick={() => { void ensureSignedIn(); }}>
              {signingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบเพื่อเพิ่ม / แก้ไข'}
            </button>
          )}
        </div>
      </header>
      <section className='stats'>
        <article><small>{nextToken ? 'จำนวนรายการที่โหลด' : 'จำนวนรายการ'}</small><b>{rows.length}</b><div className='pendingCount'>รอเลขจริง {rows.filter(isWaiting).length} รายการ (รวมเลขชั่วคราว)</div></article>
        <article><small>วงเงินรวม{nextToken ? ' (รายการที่โหลด)' : ''}</small><b>{money(total)} ฿</b></article>
        <article><small>เลขประกาศล่าสุดที่แสดง</small><b>{rows.find(r => r.announcement_no && !isPlaceholder(r))?.announcement_no || '-'}</b></article>
      </section>
      <section className='panel'>
        <div className='tools'>
          <div><h2>รายการเลขประกาศ</h2><p>{editMode ? 'โหมดแก้ไข: แก้ไขทุกช่องหรือลบรายการซ้ำ โดยยืนยันก่อนลบ' : 'เรียงเลขประกาศจากมากไปน้อย พร้อมแคปหน้าจอ · รายการรอเลขอยู่ด้านล่าง'}</p></div>
          <div className='toolActions'>
            <input aria-label='ค้นหา' value={q} onChange={e => setQ(e.target.value)} placeholder='ค้นหาเลขประกาศ / เรื่อง / Inventory...' />
            <button className='editButton' type='button' aria-pressed={editMode} onClick={() => setEditMode(value => !value)}>{editMode ? '✓ เสร็จสิ้นการแก้ไข' : '✎ โหมดแก้ไข'}</button>
            {editMode && <button className='primaryButton' type='button' onClick={() => { void startAdd(); }}>+ เพิ่มรายการ</button>}
          </div>
        </div>
        {message && <p role='status' className='notice success'>{message}</p>}
        {listError && <p role='alert' className='notice error'>{listError} <button type='button' onClick={() => { void loadRows(); }}>ลองอีกครั้ง</button></p>}
        <div className='tableWrap'>
          <table>
            <thead><tr>
              <th>เลขประกาศ</th>{editMode && <th>แก้ไข / ลบ</th>}<th>วันที่</th><th>เรื่อง</th><th>วงเงิน (บาท)</th><th>ปีงบ</th>
              <th>Inventory</th><th>วันที่รับ</th><th>หน่วยงาน</th><th>เลขโครงการ</th><th>สถานะ</th><th>หมายเหตุ</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className={isWaiting(r) ? 'pendingRow' : ''}>
                  <td>{r.announcement_no ? <><strong>{r.announcement_no}</strong>{isPlaceholder(r) && <span className='pendingBadge'>เลขชั่วคราว</span>}</> : <span className='pendingBadge'>รอออกเลข</span>}</td>
                  {editMode && <td><button type='button' className='editButton' onClick={() => { void startEdit(r); }}>✎ แก้ไข</button> <button type='button' className='cancelButton' disabled={Boolean(deletingId)} onClick={() => { void startDelete(r); }}>{deletingId === r.id ? 'กำลังลบ...' : 'ลบ'}</button></td>}
                  <td>{thaiDate(r.announcement_date)}</td>
                  <td className='subject'>{r.subject}</td>
                  <td className='num'>{r.amount == null ? '-' : money(r.amount)}</td>
                  <td>{r.budget_year || '-'}</td>
                  <td>{r.inventory_no || '-'}</td>
                  <td>{r.inventory_date ? thaiDate(r.inventory_date) : '-'}</td>
                  <td>{r.department || '-'}</td>
                  <td>{r.project_no || '-'}</td>
                  <td>{isWaiting(r) ? <><span className='pendingBadge'>{isPlaceholder(r) ? 'รอเลขจริง' : 'รอออกเลข'}</span>{r.status ? <span>{' ' + r.status}</span> : null}</> : r.status || '-'}</td>
                  <td>{r.note || '-'}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={editMode ? 12 : 11} className='empty'>ไม่พบรายการที่ค้นหา</td></tr>}
            </tbody>
          </table>
        </div>
        {loading && <p className='tableInfo'>กำลังโหลดข้อมูล...</p>}
        {nextToken && <div className='loadMore'><button disabled={loading} onClick={() => { void loadRows(nextToken); }}>โหลดรายการเพิ่มเติม</button></div>}
      </section>
      <footer>ทะเบียนเลขประกาศจังหวัด · เปิดดูได้ทุกคน · กดโหมดแก้ไขเมื่อต้องการปรับข้อมูล</footer>
      {formOpen && (
        <div className='modalBackdrop' role='presentation' onMouseDown={event => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}>
          <section className='formModal' role='dialog' aria-modal='true' aria-labelledby='formTitle'>
            <div className='modalHeading'>
              <div><h2 id='formTitle'>{editing ? 'แก้ไขข้อมูลทั้งหมด' + (editing.announcement_no ? ' · เลข ' + editing.announcement_no : ' · รอออกเลข') : 'เพิ่มรายการประกาศจังหวัด'}</h2><p>{editing ? 'แก้ไขได้ทุกช่องของรายการนี้ รวมถึงเลขประกาศ วันที่ เรื่อง วงเงิน ปีงบ Inventory หน่วยงาน สถานะ และหมายเหตุ โดยบันทึกทับรายการเดิม' : 'พิมพ์เรื่องไว้ก่อนแล้วบันทึกได้เลย เว้นเลขประกาศและวันที่ไว้กรอกภายหลังได้'}</p></div>
              <button type='button' className='closeButton' disabled={saving} aria-label='ปิด' onClick={() => setFormOpen(false)}>×</button>
            </div>
            <form onSubmit={e => { void save(e); }}>
              <div className='formGrid'>
                <label>เลขประกาศ (แก้ไขได้)<input value={form.announcement_no} onChange={e => field('announcement_no', e.target.value)} placeholder='ยังไม่มีเลข ให้เว้นว่างไว้' inputMode='numeric' maxLength={12} /></label>
                <label>วันที่ประกาศ (แก้ไขได้)<input required={Boolean(form.announcement_no)} type='date' value={form.announcement_date} onChange={e => field('announcement_date', e.target.value)} /></label>
                <label className='wide'>เรื่อง *<textarea required rows={3} value={form.subject} onChange={e => field('subject', e.target.value)} placeholder='ชื่อรายการ / เรื่องประกาศ' maxLength={1000} /></label>
                <label>วงเงิน (บาท)<input type='number' min='0' step='0.01' value={form.amount} onChange={e => field('amount', e.target.value)} placeholder='0.00' /></label>
                <label>ปีงบประมาณ (พ.ศ.)<input type='number' min='2400' max='2700' value={form.budget_year} onChange={e => field('budget_year', e.target.value)} placeholder='2570' /></label>
                <label>เลข Inventory<input value={form.inventory_no} onChange={e => field('inventory_no', e.target.value)} placeholder='เช่น 69-05132' maxLength={100} /></label>
                <label>วันที่รับ Inventory<input type='date' value={form.inventory_date} onChange={e => field('inventory_date', e.target.value)} /></label>
                <label>หน่วยงาน<input value={form.department} onChange={e => field('department', e.target.value)} placeholder='หน่วยงานเจ้าของเรื่อง' maxLength={200} /></label>
                <label>เลขโครงการ<input value={form.project_no} onChange={e => field('project_no', e.target.value)} placeholder='เลขที่โครงการ' maxLength={100} /></label>
                <label>สถานะ<input list='statusOptions' value={form.status} onChange={e => field('status', e.target.value)} placeholder='เลือกหรือพิมพ์เอง' maxLength={120} />
                  <datalist id='statusOptions'><option value='อยู่ระหว่างดำเนินการ'/><option value='ส่งหลักผู้ขายแล้ว'/><option value='ประกาศแล้ว'/><option value='ยกเลิก'/></datalist>
                </label>
                <label className='wide'>หมายเหตุ<textarea rows={2} value={form.note} onChange={e => field('note', e.target.value)} placeholder='เช่น ส่งหลักผู้ขาย 1 ชุด' maxLength={1000} /></label>
              </div>
              {formError && <p role='alert' className='formError'>{formError}</p>}
              <p className='formHint'>{editing ? 'กดบันทึกเพื่ออัปเดตรายการนี้โดยตรง ไม่สร้างแถวใหม่ หากเปลี่ยนเลข ระบบจะตรวจสอบเลขซ้ำก่อนบันทึก' : 'ยังไม่มีเลขให้บันทึกรายการรอออกเลขไว้ก่อน แล้วกดแก้ไขทั้งรายการเมื่อได้รับเลขจริง ข้อมูลจะแสดงให้ผู้เปิดลิงก์ทุกคนเห็น'}</p>
              <div className='formFooter'>
                <button type='button' className='cancelButton' disabled={saving} onClick={() => setFormOpen(false)}>ยกเลิก</button>
                <button type='submit' className='primaryButton' disabled={saving}>{saving ? 'กำลังบันทึก...' : form.announcement_no ? 'บันทึกข้อมูล' : 'บันทึกรายการรอออกเลข'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
export default App;


