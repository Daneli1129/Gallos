/**
 * Script de migración: Crea usuarios en Supabase Auth desde la tabla usuarios
 * 
 * Uso:
 *   1. Obtén tu SERVICE_ROLE KEY de Supabase Dashboard → Settings → API
 *   2. node scripts/migrate_auth_users.js
 *
 * Requisitos: npm install @supabase/supabase-js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nqrprvaszwocvlrjsuwr.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'PEGA_TU_SERVICE_ROLE_KEY_AQUI';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrate() {
  console.log('📥 Leyendo usuarios existentes...');

  const { data: usuarios, error } = await sb
    .from('usuarios')
    .select('id, username, password_hash, nombre_completo, rol');

  if (error) {
    console.error('❌ Error al leer usuarios:', error.message);
    process.exit(1);
  }

  if (!usuarios || usuarios.length === 0) {
    console.log('✅ No hay usuarios para migrar.');
    return;
  }

  console.log(`📋 Encontrados ${usuarios.length} usuarios:`);

  for (const u of usuarios) {
    // Ya tiene auth_id? skip
    const { data: existing } = await sb
      .from('usuarios')
      .select('auth_id')
      .eq('id', u.id)
      .single();

    if (existing?.auth_id) {
      console.log(`  ⏭️  ${u.username} ya tiene auth_id, saltando...`);
      continue;
    }

    const email = `${u.username}@gallogold.local`;

    console.log(`  🔐 Creando auth user para ${u.username} (${email})...`);

    // Crear usuario en Supabase Auth usando admin API
    const { data: authUser, error: authError } = await sb.auth.admin.createUser({
      email: email,
      password: u.password_hash,
      email_confirm: true,
      user_metadata: {
        username: u.username,
        nombre_completo: u.nombre_completo,
        rol: u.rol
      }
    });

    if (authError) {
      console.error(`  ❌ Error creando auth user ${u.username}:`, authError.message);
      continue;
    }

    // Vincular auth_id con la tabla usuarios
    const { error: updateError } = await sb
      .from('usuarios')
      .update({ auth_id: authUser.user.id })
      .eq('id', u.id);

    if (updateError) {
      console.error(`  ❌ Error actualizando auth_id para ${u.username}:`, updateError.message);
    } else {
      console.log(`  ✅ ${u.username} → auth_id: ${authUser.user.id}`);
    }
  }

  console.log('\n🎉 Migración completada.');
  console.log('⚠️  Recuerda: Los usuarios ahora inician sesión con: username@gallogold.local');
  console.log('   (o puedes actualizar shared.js para usar otro formato de email)');
}

migrate().catch(console.error);
